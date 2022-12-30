import { persistentKey, PiniaHistory, HistoryStore } from './index';
import { defineStore, setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { ref } from 'vue';
import 'mock-local-storage';

import { vitest, describe, beforeEach, afterEach, it, expect } from 'vitest';

describe('Pinia History', () => {
  let fullOptionsStore: any, optionsStore: any, setupStore: any; // possible store vars that we can use. here so we can dispose automatically afterEach
  
  const useOptionsStore = defineStore('one', {
    state:   () => ({ count: 1 }),
    history: true,
  });
  
  const useFullOptionsStore = defineStore({
    id:      'one',
    state:   () => ({ count: 1 }),
    history: true,
  });
  
  const useSetupStore = defineStore('one', () => {
        const count = ref(1);
        return { count };
      },
      { history: true },
  );
  
  beforeEach(() => {
    const pinia = createTestingPinia({
      createSpy: vitest.fn,
      plugins:   [PiniaHistory],
    });
    setActivePinia(pinia);
    localStorage.clear();
  });
  
  afterEach(() => {
    if (!!fullOptionsStore) fullOptionsStore.$dispose();
    if (!!optionsStore) optionsStore.$dispose();
    if (!!setupStore) setupStore.$dispose();
  });
  
  it('should add undo or redo method if history is disabled', async () => {
    const useOptionsStore = defineStore('one', {
      state:   () => ({ count: 1 }),
      history: false,
    });
    
    const useFullOptionsStore = defineStore({
      id: 'one', state: () => ({ count: 1 }),
      // history: false, /** intentionally unspecified to emulate non-opting */
    });
    
    const useSetupStore = defineStore('one', () => {
          const count = ref(1);
          return { count };
        },
        { history: false },
    );
    
    fullOptionsStore = useFullOptionsStore();
    optionsStore = useOptionsStore();
    setupStore = useSetupStore();
    expect(fullOptionsStore.undo).toBeUndefined();
    expect(optionsStore.undo).toBeUndefined();
    expect(setupStore.undo).toBeUndefined();
    expect(fullOptionsStore.redo).toBeUndefined();
    expect(optionsStore.redo).toBeUndefined();
    expect(setupStore.redo).toBeUndefined();
  });
  
  it('should add undo method', async () => {
    // Check if typings work for all types of stores.
    
    fullOptionsStore = useFullOptionsStore();
    optionsStore = useOptionsStore();
    setupStore = useSetupStore();
    expect(fullOptionsStore.undo).toBeDefined();
    expect(optionsStore.undo).toBeDefined();
    expect(setupStore.undo).toBeDefined();
  });
  
  it('should add redo method', async () => {
    // Check if typings work for all types of stores.
    
    fullOptionsStore = useFullOptionsStore();
    optionsStore = useOptionsStore();
    setupStore = useSetupStore();
    expect(fullOptionsStore.redo).toBeDefined();
    expect(optionsStore.redo).toBeDefined();
    expect(setupStore.redo).toBeDefined();
  });
  
  it('should add canUndo getter', async () => {
    // Check if typings work for all types of stores.
    
    fullOptionsStore = useFullOptionsStore();
    optionsStore = useOptionsStore();
    setupStore = useSetupStore();
    expect(fullOptionsStore.canUndo).toBeDefined();
    expect(optionsStore.canUndo).toBeDefined();
    expect(setupStore.canUndo).toBeDefined();
  });
  
  it('should add canRedo getter', async () => {
    // Check if typings work for all types of stores.
    
    fullOptionsStore = useFullOptionsStore();
    optionsStore = useOptionsStore();
    setupStore = useSetupStore();
    expect(fullOptionsStore.canRedo).toBeDefined();
    expect(optionsStore.canRedo).toBeDefined();
    expect(setupStore.canRedo).toBeDefined();
  });
  
  it('should undo using direct mutations', async () => {
    setupStore = useSetupStore();
    setupStore.count = 2;
    setupStore.count = 5;
    setupStore.count = 3;
    expect(setupStore.count).toEqual(3);
    setupStore.undo();
    expect(setupStore.count).toEqual(5);
    setupStore.undo();
    expect(setupStore.count).toEqual(2);
    setupStore.undo();
    expect(setupStore.count).toEqual(1);
    expect(setupStore.canUndo).toBeFalsy();
  });
  
  it('should undo using patch mutations', async () => {
    setupStore = useSetupStore();
    setupStore.$patch({ count: 2 });
    setupStore.$patch({ count: 5 });
    setupStore.$patch({ count: 3 });
    expect(setupStore.count).toEqual(3);
    setupStore.undo();
    expect(setupStore.count).toEqual(5);
    setupStore.undo();
    expect(setupStore.count).toEqual(2);
    setupStore.undo();
    expect(setupStore.count).toEqual(1);
    expect(setupStore.canUndo).toBeFalsy();
  });
  
  it('should work with objects (key removal)', async () => {
    const useStore = defineStore('complex', {
      state:   () => ({ someObject: { someKey: 1, someOtherKey: 4 } }),
      history: true,
    });
    
    optionsStore = useStore();
    
    // @ts-ignore
    delete optionsStore.someObject.someOtherKey;
    
    expect(optionsStore.$state).toMatchObject({ someObject: { someKey: 1 } });
    
    optionsStore.undo();
    
    expect(optionsStore.$state).toMatchObject({
      someObject: { someKey: 1, someOtherKey: 4 },
    });
    
    optionsStore.redo();
    
    expect(optionsStore.$state).toMatchObject({ someObject: { someKey: 1 } });
  });
  
  it('should redo using direct mutations', async () => {
    setupStore = useSetupStore();
    setupStore.count = 2;
    setupStore.count = 5;
    setupStore.count = 3;
    setupStore.undo();
    setupStore.undo();
    setupStore.undo();
    expect(setupStore.count).toEqual(1);
    setupStore.redo();
    expect(setupStore.count).toEqual(2);
    setupStore.redo();
    expect(setupStore.count).toEqual(5);
    setupStore.redo();
    expect(setupStore.count).toEqual(3);
    expect(setupStore.canRedo).toBeFalsy();
  });
  
  it('should redo using patch mutations', async () => {
    setupStore = useSetupStore();
    setupStore.$patch({ count: 2 });
    setupStore.$patch({ count: 5 });
    setupStore.$patch({ count: 3 });
    setupStore.undo();
    setupStore.undo();
    setupStore.undo();
    expect(setupStore.count).toEqual(1);
    setupStore.redo();
    expect(setupStore.count).toEqual(2);
    setupStore.redo();
    expect(setupStore.count).toEqual(5);
    setupStore.redo();
    expect(setupStore.count).toEqual(3);
    expect(setupStore.canRedo).toBeFalsy();
  });
  
  it('should invalidate redo', async () => {
    setupStore = useSetupStore();
    setupStore.$patch({ count: 2 });
    setupStore.$patch({ count: 5 });
    setupStore.undo();
    expect(setupStore.canRedo).toBeTruthy();
    setupStore.$patch({ count: 4 });
    expect(setupStore.canRedo).toBeFalsy();
    expect(setupStore.canUndo).toBeTruthy();
    setupStore.undo();
    expect(setupStore.count).toEqual(2);
    expect(setupStore.canRedo).toBeTruthy();
    setupStore.redo();
    expect(setupStore.count).toEqual(4);
  });
  
  it('should only store up to `option.max` items', async () => {
    const max = 5;
    
    setupStore = defineStore('one', () => {
          const count = ref(1);
          return { count };
        },
        { history: { max } },
    )();
    
    for (let i = 0; i < max + 1; i++) {
      setupStore.$patch({ count: i });
    }
    
    for (let i = 0; i < max; i++) {
      setupStore.undo();
    }
    
    expect(setupStore.count).toEqual(0);
    expect(setupStore.canUndo).toBeFalsy();
    
    for (let i = 0; i < max; i++) {
      setupStore.redo();
    }
    
    expect(setupStore.count).toEqual(5);
    expect(setupStore.canRedo).toBeFalsy();
  });
  
  it('should persist the history', async () => {
    setupStore = defineStore('one', () => {
          const count = ref(1);
          return { count };
        },
        { history: { persistent: true } },
    )();
    
    const undoKey = persistentKey(setupStore, 'undo');
    const redoKey = persistentKey(setupStore, 'redo');
    
    setupStore.$patch({ count: 2 });
    
    expect(localStorage.getItem(undoKey)).toEqual('eyJqc29uIjp7ImNvdW50IjoxfX0=');
    expect(localStorage.getItem(redoKey)).toEqual('');
    
    setupStore.undo();
    
    expect(setupStore.count).toEqual(1);
    expect(localStorage.getItem(undoKey)).toEqual('');
    expect(localStorage.getItem(redoKey)).toEqual('eyJqc29uIjp7ImNvdW50IjoyfX0=');
    
    setupStore.redo();
    
    expect(setupStore.count).toEqual(2);
    expect(localStorage.getItem(undoKey)).toEqual('eyJqc29uIjp7ImNvdW50IjoxfX0=');
    expect(localStorage.getItem(redoKey)).toEqual('');
  });
  
  it('should persist the history with custom strategy', async () => {
    const storage: any = {};
    
    setupStore = defineStore('one', () => {
          const count = ref(1);
          return { count };
        },
        {
          history: {
            persistent:         true,
            persistentStrategy: {
              get (store, type) {
                return storage[store.$id]?.[type].split(',');
              },
              set (store, type, value) {
                storage[store.$id] = storage[store.$id] ?? {};
                storage[store.$id][type] = value.join(',');
              },
              remove (store, type) {
                delete storage[store.$id]?.[type];
              },
            },
          },
        },
    )();
    
    setupStore.$patch({ count: 2 });
    
    expect(storage[setupStore.$id].undo).toEqual('{"json":{"count":1}}');
    expect(storage[setupStore.$id].redo).toEqual('');
    
    setupStore.undo();
    
    expect(setupStore.count).toEqual(1);
    expect(storage[setupStore.$id].undo).toEqual('');
    expect(storage[setupStore.$id].redo).toEqual('{"json":{"count":2}}');
    
    setupStore.redo();
    
    expect(setupStore.count).toEqual(2);
    expect(storage[setupStore.$id].undo).toEqual('{"json":{"count":1}}');
    expect(storage[setupStore.$id].redo).toEqual('');
  });
  
  
  it('should use omit and undo using patch mutations', async () => {
    const useStore = defineStore('one', {
      state:   () => ({ count: 1, toIgnore: 1 }),
      history: { omit: ['toIgnore'] },
    });
    
    optionsStore = useStore();
    
    optionsStore.$patch({ count: 2, toIgnore: 6 });
    optionsStore.$patch({ count: 5 });
    optionsStore.$patch({ count: 3, toIgnore: 20 });
    expect(optionsStore.count).toEqual(3);
    expect(optionsStore.toIgnore).toEqual(20);
    
    optionsStore.undo();
    expect(optionsStore.count).toEqual(5);
    expect(optionsStore.toIgnore).toEqual(20);
    
    optionsStore.undo();
    expect(optionsStore.count).toEqual(2);
    expect(optionsStore.toIgnore).toEqual(20);
    
    optionsStore.undo();
    expect(optionsStore.count).toEqual(1);
    expect(optionsStore.toIgnore).toEqual(20);
    
    expect(optionsStore.canUndo).toBeFalsy();
  });
  
});
