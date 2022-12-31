import { PiniaPluginContext, Store, SubscriptionCallbackMutation } from 'pinia';
import { computed, ComputedRef, reactive } from 'vue';
import { stringify, parse } from '@emanimation/js-serial-js';
import lzutf8 from 'lzutf8';

const { compress, decompress } = lzutf8;

declare module 'pinia' {
  export interface DefineStoreOptionsBase<S, Store> {
    history?: boolean | Partial<HistoryPluginOptions>;
  }
  
  export function defineStore<
      Id extends string,
      S extends StateTree = {},
      G extends _GettersTree<S> = {},
      A = {},
      H = false
  > (
      id: Id,
      options: Omit<DefineStoreOptions<Id, S, G, A>, 'id'> & { history: H },
  ): H extends false
      ? StoreDefinition<Id, S, G, A>
      : StoreDefinition<Id, S, G & HistoryPluginGetters, A & HistoryPluginActions>
  
  export function defineStore<
      Id extends string,
      S extends StateTree = {},
      G extends _GettersTree<S> = {},
      A = {},
      H = false
  > (
      options: DefineStoreOptions<Id, S, G, A> & { history: H },
  ): H extends false
      ? StoreDefinition<Id, S, G, A>
      : StoreDefinition<Id, S, G & HistoryPluginGetters, A & HistoryPluginActions>
  
  export function defineStore<Id extends string, SS, H = false> (
      id: Id,
      storeSetup: () => SS,
      options?: DefineSetupStoreOptions<
          Id,
          StoreState<SS>,
          StoreGetters<SS>,
          StoreActions<SS>
      > & { history: H },
  ): H extends false
      ? StoreDefinition<Id, StoreState<SS>, StoreGetters<SS>, StoreActions<SS>>
      : StoreDefinition<
          Id,
          StoreState<SS>,
          StoreGetters<SS> & HistoryPluginGetters,
          StoreActions<SS> & HistoryPluginActions
      >
}

export interface HistoryPluginOptions {
  max: number;
  persistent: boolean;
  omit: Array<string>;
  persistentStrategy: {
    get (store: HistoryStore, type: 'undo' | 'redo'): string[] | undefined
    set (store: HistoryStore, type: 'undo' | 'redo', value: string[]): void
    remove (store: HistoryStore, type: 'undo' | 'redo'): void
  };
}

export interface HistoryPluginActions {
  undo (): void;
  
  redo (): void;
}

export interface HistoryPluginGetters {
  canUndo: ComputedRef<boolean>;
  canRedo: ComputedRef<boolean>;
}

export interface History extends HistoryPluginOptions {
  done: string[];
  undone: string[];
  current: string;
  preventUpdateOnSubscribe: boolean;
}

export interface HistoryStore
    extends Store,
        HistoryPluginGetters,
        HistoryPluginActions {}

/**
 * Base options for the history.
 */
export const BasePiniaHistoryOptions = {
  max:                10,
  persistent:         false,
  omit:               [],
  persistentStrategy: {
    get (store: HistoryStore, type: 'undo' | 'redo'): string[] | undefined {
      if (typeof localStorage !== undefined) {
        const key = persistentKey(store, type);
        const value = localStorage.getItem(key);
        if (!value) return;
        
        const string = decompress(value, {
          inputEncoding: 'Base64',
        }) as string;
        
        return string.split(',');
      }
    },
    set (store: HistoryStore, type: 'undo' | 'redo', value: string[]) {
      if (typeof localStorage !== undefined) {
        const key = persistentKey(store, type);
        
        const string = value.join(',');
        
        localStorage.setItem(
            key,
            compress(string, {
              outputEncoding: 'Base64',
            }),
        );
      }
    },
    remove (store: HistoryStore, type: 'undo' | 'redo') {
      if (typeof localStorage !== undefined) {
        const key = persistentKey(store, type);
        localStorage.removeItem(key);
      }
    },
  },
};

/**
 * Merge the user options with the default ones.
 *
 * @param options
 * @returns {HistoryPluginOptions}
 */
function mergeOptions (options: boolean | Partial<HistoryPluginOptions>) {
  return {
    ...BasePiniaHistoryOptions,
    ...(typeof options === 'boolean' ? {} : options),
  } as HistoryPluginOptions;
}


/**
 * Clone store state and remove omitted properties from the store state.
 * @param store The store the plugin is augmenting.
 * @param $history
 * @param state
 * @returns {string} State of the store without omitted keys.
 */
function cloneRemoveOmittedKeys (store: HistoryStore, $history: History, state?: Store['$state']): string {
  const src = !!state ? stringify(state) : stringify(store.$state);
  const clone = parse (src );
  if ($history.omit.length) {
    $history.omit.forEach((key) => {
      delete clone[key];
    });
  }
  return stringify(clone);
}

/**
 * Save the history based on the given persistent strategy.
 *
 * @param store
 * @param $history
 */
function persistHistory (store: HistoryStore, $history: History) {
  const {
    persistent,
    persistentStrategy: { set },
    done,
    undone,
  } = $history;
  
  if (persistent) {
    set(store, 'undo', done);
    set(store, 'redo', undone);
  }
}

/**
 * Create a persistent history.
 *
 * @param $store
 * @param $history
 * @returns
 */
function createPersistentHistory ($store: HistoryStore, $history: History) {
  const {
    persistent,
    persistentStrategy: { get, set, remove },
  } = $history;
  
  if (persistent) {
    if ($history.done.length === 0) {
      $history.done = get($store, 'undo') ?? [];
    } else {
      set($store, 'undo', $history.done);
    }
    
    if ($history.undone.length === 0) {
      $history.undone = get($store, 'redo') ?? [];
    } else {
      set($store, 'redo', $history.undone);
    }
  } else {
    remove($store, 'undo');
    remove($store, 'redo');
  }
}

/**
 * Create an undo/redo method for the given store.
 *
 * @param store
 * @param $history
 * @param method
 * @returns
 */
function createStackMethod (
    $store: HistoryStore,
    $history: History,
    method: 'undo' | 'redo',
) {
  const can = method === 'undo' ? 'canUndo' : 'canRedo';
  // todo allow a param to be passed to stack methods that allows undo/redo of specific store state props?
  return () => {
    if ($store[can]) {
      const { undone, done, max, current } = $history;
      const stack = method === 'undo' ? done : undone;
      const reverseStack = method === 'undo' ? undone : done;
      
      const state = stack.pop();
      
      if (state === undefined) return;
      
      if (reverseStack.length >= max) {
        reverseStack.splice(0, 1);
      }
      
      reverseStack.push(current);
      
      $history.preventUpdateOnSubscribe = false;
      $store.$patch(Object.assign({}, $store.$state, parse( state)));
      $history.preventUpdateOnSubscribe = true;
      
      persistHistory($store, $history);
    }
  };
}

/**
 * Create the store watcher to save
 * every mutation change.
 *
 * @param $store
 * @param $history
 * @returns
 */
function createWatcher ($store: HistoryStore, $history: History) {
  return (_mutation: SubscriptionCallbackMutation<any>, state: HistoryStore['$state']) => {
    const { preventUpdateOnSubscribe, max, done, current } = $history;
    
    if (preventUpdateOnSubscribe) {
      if (done.length >= max) {
        done.splice(0, 1);
      }
      
      done.push(current);
      $history.undone = [];
      persistHistory($store, $history);
    }
    
    $history.current = cloneRemoveOmittedKeys($store, $history, state);
  };
}

/**
 * Create a key for storing history state.
 *
 * @param store
 * @param method
 * @returns
 */
export function persistentKey (store: Store, method: 'undo' | 'redo') {
  return `pinia-plugin-history-${store.$id}-${method}` as const;
}

/**
 * Adds a `history` option to your store to add `undo` and `redo` methods
 * and manage your state history.
 *
 * @example
 *
 * ```ts
 * import { PiniaHistory } from 'pinia-plugin-history'
 *
 * // Pass the plugin to your application's pinia plugin
 * pinia.use(PiniaHistory)
 * ```
 */
export const PiniaHistory = ({ options, store }: PiniaPluginContext) => {
  const { history } = options;
  
  if (history) {
    const { max, omit, persistent, persistentStrategy } = mergeOptions(history);
    
    const $store = store as HistoryStore;
    
    const $history = reactive({
      max,
      omit,
      persistent,
      persistentStrategy,
      done:                     [],
      undone:                   [],
      current:                  '',
      preventUpdateOnSubscribe: true,
      resetUndone:              false,
    } as History);
    
    $history.current = cloneRemoveOmittedKeys($store, $history);
    
    store.canUndo = computed(() => $history.done.length > 0);
    
    store.canRedo = computed(() => $history.undone.length > 0);
    
    store.undo = createStackMethod($store, $history, 'undo');
    
    store.redo = createStackMethod($store, $history, 'redo');
    
    store.$subscribe(createWatcher($store, $history));
    
    createPersistentHistory($store, $history);
  }
};
