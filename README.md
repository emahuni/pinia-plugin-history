<h1>
  <img height="64" src="https://pinia.esm.dev/logo.svg" alt="Pinia logo">
  Pinia Plugin History
</h1>

<a href="https://npmjs.com/package/pinia-plugin-history">
  <img src="https://badgen.net/npm/v/pinia-plugin-history" alt="npm package">
</a>
<a href="https://github.com/yassilah/pinia-plugin-history/actions/workflows/run-tests.yml">
  <img src="https://github.com/yassilah/pinia-plugin-history/actions/workflows/run-tests.yml/badge.svg" alt="build status">
</a>
<a href="https://codecov.io/gh/yassilah/pinia-plugin-history">
  <img src="https://codecov.io/gh/yassilah/pinia-plugin-history/branch/main/graph/badge.svg"/>
</a>

Add undo and redo methods to any your pinia 🍍 stores!

This works with various types of values in the state, which include Dates, BigInts, Functions, Maps, Sets, circular objs and more. The original fork has issues.

## Installation

```sh
npm install pinia-plugin-history
```

or

```sh
yarn add pinia-plugin-history
```

## Usage

```ts
import { PiniaHistory } from 'pinia-plugin-history'

// Pass the plugin to your application's pinia plugin
pinia.use(PiniaHistory)
```

You can then use a `history` option in your stores:

```ts
defineStore('id', () => {
  const count = ref(2)
  
  return { count }
}, { history: true })
```

or

```ts
defineStore('id', {
  state:   () => ({ count: 2 }),
  history: true
})
```

This will automatically add two actions `undo` and `redo` as well as two getters `canUndo` and `canRedo` to you store. It will also automatically add the proper typings if you're
using TypeScript 🎉

### Example

```vue

<template>
  <div>
    <button :disabled="!store.canUndo" @click="store.undo">Undo</button>
    <button :disabled="!store.canRedo" @click="store.redo">Redo</button>
    <input type="number" v-model="store.count"/>
  </div>
</template>

<script lang="ts" setup>
  import { useStore } from '@/store'; // store defined in another file as above

  const store = useStore();

  store.count = 5;
  store.undo(); // undoes the previous assignment of 5
  console.log(store.count); // => 2
  store.redo(); // redoes the earlier assignment of 5
  console.log(store.count); // => 5
</script>
```

## Configuration

You may also pass some extra configuration to the `history` option.

```ts
defineStore('id', {
  state:   () => ({ count: 2, toIgnore: 'this will be ignored thru options' }),
  history: {
    max:  25, // Maximum number of items to keep in history (default: 10)
    omit: ['toIgnore'], // shallow
    
    persistent: true, // Whether to store the current history locally in your browser (default: false)
    
    persistentStrategy: { // How to store locally in your broswer (default: use `localStorage` if available)
      get (store: HistoryStore, type: 'undo' | 'redo'): string[] | undefined,
      set (store: HistoryStore, type: 'undo' | 'redo', value: string[]): void,
      remove (store: HistoryStore, type: 'undo' | 'redo'): void
    }
  }
})
```

## Acknowledgements

**Yasser Lahbibi**: yasser.lahbibi@sciencespo.fr - the difference with this one is the use of a better cloning strategy that tries to keep the original objects as they were and also works with functions. Plus other various additions features and options.

## License

[MIT](http://opensource.org/licenses/MIT)
