import React, { Component } from 'react'
import io from 'socket.io-client'
import { createStore, combineReducers } from 'redux'
import { Provider, connect } from 'react-redux'
import { composeWithDevTools } from 'redux-devtools-extension'
import uuidv4 from 'uuid/v4'

// #region
const cache = {}
const subscriptions = {}
let MainStore
let socket
let serverAddress
let server = false
let logger = false
let providerStore
let initialStore = false
let testing = false
// #endregion

// #region : REDUX STORE

const addToReduxStore = (object) => {
  return {
    type: Object.keys(object)[0],
    payload: object
  }
}

const deleteFromReduxStore = (key) => {
  return {
    type: 'DESTROY: ' + key,
    payload: key
  }
}

const mapStateToProps = store => ({
  reduxStore: store.reduxStore
})

const mapDispatchToProps = dispatch => ({
  addToReduxStore: object => dispatch(addToReduxStore(object)),
  deleteFromReduxStore: object => dispatch(deleteFromReduxStore(object))
})

let newState

const storeReducer = (state = {}, action) => {
  switch (action.type.slice(0, 7)) {
    case 'DESTROY':
      newState = Object.assign({}, state)
      delete newState[action.payload]
      return newState
    default:
      return Object.assign({}, state, action.payload)
  }
}

const reducers = combineReducers({
  reduxStore: storeReducer
})

class WarpStore extends Component {
  UNSAFE_componentWillMount() { // eslint-disable-line
    // Call Redux action creator with initial store passed in by client
    if (initialStore) this.props.props.addToReduxStore(this.props.props.props.initialStore)
  }

  render () {
    // If an initial store was provided, wait for it to be set in Redux before rendering
    if (initialStore && Object.keys(this.props.props.reduxStore).length === 0) return <div />
    else return this.props.props.props.children
  }
}

class _ReduxWrapper extends Component {
  // Setting a reference to a React component so its props (Redux store and methods) can be accessed
  renderStore () {
    MainStore = <WarpStore props={this.props} />
    return MainStore
  }

  render () {
    return this.renderStore()
  }
}

const ReduxWrapper = connect(mapStateToProps, mapDispatchToProps)(_ReduxWrapper)

class ProviderWrapper extends Component {
  render () {
    return (
      <Provider store={providerStore} >
        <ReduxWrapper props={this.props} />
      </Provider>
    )
  }
}

// Returns main ProviderWrapper after initial setup (prop options)
export function WarpGate (props) {
  // Initial setup
  initialStore = props.hasOwnProperty('initialStore')
  if (props.logger && typeof props.logger !== 'function') logger = true
  if (props.logger && typeof props.logger === 'function') logger = props.logger
  if (props.devTools && props.devTools === true) {
    providerStore = createStore(reducers, composeWithDevTools())
  } else providerStore = createStore(reducers)
  if (props.serverAddress) {
    testing = true
    serverAddress = props.serverAddress
  }
  return new ProviderWrapper(props)
}
WarpGate.prototype = React.Component.prototype // FALAN

// #endregion

// #region : USER FUNCTIONS

export const getStoreComponent = () => MainStore

export const getStore = () => MainStore.props.props.reduxStore

export const subscribeServer = (key, fn) => {
  if (!server) setupSocket()
  if (logger) logHelper('subscribe', key)
  const actionId = uuidv4()
  cache[actionId] = { method: 'subscribe', key, actionId }
  socket.emit('subscribe', { key })
  // Add the callback that will be called later to the 'subscriptions' object
  addSubscription(key, actionId, fn)
}

export const subscribeLocal = (key, fn) => {
  if (logger) logHelper('subscribeLocal', key)
  const actionId = uuidv4()
  // Add the callback that will be called later to the 'subscriptions' object
  addSubscription(key, actionId, fn)
}

export const set = async (...args) => {
  if (args.length === 1 && typeof args[0] === 'object') {
    // Set with an object
    if (logger) logHelper('setSingle', args[0])
    await addToStore(args[0])
    notifyLocalUpdates(Object.keys(args[0]))
  } else {
    // Set with ...args
    if (logger) logHelper('setMulti', args)
    let keysToNotify = []
    for (let i = 0; i < args.length; i = i + 2) {
      if (i + 1 === args.length) {
        await addToStore({ [args[i]]: null })
      } else {
        await addToStore({ [args[i]]: args[i + 1] })
      }
      keysToNotify.push(args[i])
    }
    notifyLocalUpdates(keysToNotify)
  }
}

export const get = (...keys) => {
  if (logger) logHelper('get', keys)
  // Returns the entire store if no arguments are provided
  if (keys.length === 0) return MainStore.props.props.reduxStore
  else if (keys.length > 1) {
    const results = {}
    keys.forEach(key => { results[key] = MainStore.props.props.reduxStore[key] })
    return results
  } else return MainStore.props.props.reduxStore[keys[0]]
}

export const save = (...args) => {
  if (args.length === 1 && typeof args[0] === 'object') {
    // Set with an object
    if (logger) logHelper('saveSingle', args[0])
    return new Promise((resolve, reject) => {
      run('set', args[0])
        .then(res => { resolve(res) })
        .catch(err => { reject(err) })
    })
  } else {
    // Set with ...args
    if (logger) logHelper('saveMulti', args)
    for (let i = 0; i < args.length; i = i + 2) {
      if (i + 1 === args.length) {
        return new Promise((resolve, reject) => {
          run('set', { [args[i]]: null })
            .then(res => { resolve(res) })
            .catch(err => { reject(err) })
        })
      } else {
        return new Promise((resolve, reject) => {
          run('set', { [args[i]]: args[i + 1] })
            .then(res => { resolve(res) })
            .catch(err => { reject(err) })
        })
      }
    }
  }
}

export const load = (...keys) => {
  if (logger) logHelper('get', keys)
  // Returns the entire database if no arguments are provided
  if (keys.length === 0) {
    return new Promise((resolve, reject) => {
      run('getAll')
        .then(res => { resolve(res) })
        .catch(err => { reject(err) })
    })
  } else if (keys.length > 0) {
    return new Promise((resolve, reject) => {
      run('get', keys)
        .then(res => { resolve(res) })
        .catch(err => { reject(err) })
    })
  }
}

export const removeLocal = (...keys) => {
  if (logger) logHelper('destroy', keys)
  keys.forEach(key => MainStore.props.props.deleteFromReduxStore(key))
}

export const removeFromDatabase = (...keys) => {
  if (logger) logHelper('destroy', keys)
  if (keys.length > 0) {
    return new Promise((resolve, reject) => {
      run('delete', keys)
        .then(res => { resolve(res) })
        .catch(err => { reject(err) })
    })
  } else {
    return new Promise((resolve, reject) => {
      run('deleteAll', {})
        .then(res => { resolve(res) })
        .catch(err => { reject(err) })
    })
  }
}

export const unsubscribe = (key) => {
  if (!server) setupSocket()
  if (logger) logHelper('unsubscribe', key)
  const actionId = uuidv4()
  cache[actionId] = { method: 'unsubscribe', key, actionId }
  socket.emit('unsubscribe', { key, actionId })
  delete subscriptions[key]
}

export const isOfflineCacheEmpty = () => Object.keys(cache).length === 0

export const getCache = () => cache

// #endregion

// #region : MAIN FUNCTIONS

export const run = (keys, request) => {
  if (!Array.isArray(keys)) keys = [keys]
  if (!server) setupSocket()
  const actionId = uuidv4()
  if (logger) logHelper('run', keys, request, actionId)
  socket.emit('run', { keys, request, actionId, socketID: socket.id })

  // Will be called when the server responds
  return new Promise((resolve, reject) => {
    cache[actionId] = { method: 'query', keys, request, actionId, resolve, reject, socketID: socket.id }
  })
}

export const emit = (key, request) => {
  if (!server) setupSocket()
  const actionId = uuidv4()
  if (logger) logHelper('emit', key, request, actionId)
  socket.emit('emit', { key, request, actionId, socketID: socket.id })

  // Pass the resolve and reject functions from the promise
  // to the cache so they can be called when the server responds
  return new Promise((resolve, reject) => {
    cache[actionId] = { method: 'query', key, request, actionId, resolve, reject, socketID: socket.id }
  })
}

const notifyLocalUpdates = (keys) => {
  keys.filter(key => subscriptionExists(key))
    .forEach(key => {
      let val = MainStore.props.props.reduxStore[key]
      // Run all subscribed functions
      Object.values(subscriptions[key]).forEach(fn => {
        fn(val)
      })
    })
}

const addSubscription = (key, actionId, fn) => {
  if (subscriptionExists(key)) {
    const sub = subscriptions[key]
    sub[actionId] = fn
  } else {
    subscriptions[key] = { [actionId]: fn }
  }
}

// Called only when a server needed
const setupSocket = () => {
  server = true
  if (testing) socket = io.connect(serverAddress)
  else socket = io.connect()

  // Always check the cache for pending requests
  // on a socket connection/reconnection
  socket.on('connect', () => {
    Object.values(cache).forEach(x => {
      if (x.method === 'query') socket.emit(x.method, { key: x.key, request: x.request, actionId: x.actionId, socketID: x.socketID })
      if (x.method === 'subscribe' || x.method === 'unsubscribe') socket.emit(x.method, { key: x.key, actionId: x.actionId })
    })
  })
  socket.on('response', data => {
    let actionId = data.actionId
    let response = data.response

    // If multiple actions are run at once (i.e. run([__, __]) an object containing each response will be returned
    // Each response in the returned object will have the same action id

    // If the object from the server doesn't have an actionId on its first level, we know
    // multiple actions were ran in a 'run' method and the object must be parsed a bit first
    if (!data.hasOwnProperty('actionId')) {
      const keys = Object.keys(data)
      actionId = data[keys[0]].actionId
      keys.forEach(key => {
        if (data[key].preError) data[key] = data[key].preError
        else if (data[key].databaseError) data[key] = data[key].databaseError
        else if (data[key].actionError) data[key] = data[key].actionError
        else if (data[key].keyError) data[key] = data[key].keyError
        else data[key] = data[key].response
      })
      response = data
    }

    // If any errors are on the object, reject the promise
    // Otherwise resolve and delete it out of cache
    if (cache[actionId]) {
      if (data.preError) cache[actionId].reject(data.preError)
      else if (data.databaseError) cache[actionId].reject(data.databaseError)
      else if (data.actionError) cache[actionId].reject(data.actionError)
      else if (data.keyError) cache[actionId].reject(data.keyError)
      else cache[actionId].resolve(response)
      delete cache[actionId]
    }
  })

  // On a response from the server for a subscribed socket,
  // call the function that was passed into the 'on' method
  socket.on('subscription', updatedPair => {
    console.log('SUBSCRIPTION EVENT:', updatedPair)
    Object.values(subscriptions[updatedPair.key]).forEach(fn => {
      fn(updatedPair.value)
    })
  })

  // Take the action out of the cache whenever the
  // server successfully completed its task
  // socket.on('emitOnUnsubscribeResponse', data => {
  //   delete cache[data.actionId]
  // })
}

// #endregion

// #region : UTILITY FUNCTIONS

const subscriptionExists = (key) => subscriptions.hasOwnProperty(key)

const logHelper = (msg, ...etc) => {
  if (msg === 'run') {
    let request
    etc[0] ? request = etc[1] : request = 'none'
    if (typeof logger !== 'function') {
      console.log('Run: ', etc[0], '\nRequest: ', request, '\nID: ', etc[2])
    };
    if (typeof logger === 'function') {
      logger('Run: ' + etc[0] + 'Request: ' + request + 'ID: ' + etc[2])
    };
  }
  if (msg === 'on') {
    if (typeof logger !== 'function') console.log('On: ', etc[0])
    if (typeof logger === 'function') logger('On: ' + etc[0])
  }
  if (msg === 'subscribe') {
    if (typeof logger !== 'function') console.log('Subscribe: ', etc[0])
    if (typeof logger === 'function') logger('Subscribe: ' + etc[0])
  }
  if (msg === 'unsubscribe') {
    if (typeof logger !== 'function') console.log('Unsubscribe: ', etc[0])
    if (typeof logger === 'function') logger('Unsubscribe: ' + etc[0])
  }
  if (msg === 'emit') {
    let request
    !etc[1] ? request = 'none' : request = etc[1]
    if (logger && typeof logger !== 'function') {
      console.log('Emit: ', etc[0], '\nRequest: ', request, '\nID: ', etc[2])
    };
    if (logger && typeof logger === 'function') {
      logger('Emit: ' + etc[0] + 'Request: ' + request + 'ID: ' + etc[2])
    };
  }
  if (msg === 'setSingle') {
    if (typeof logger !== 'function') console.log('setSingle: ', etc[0])
    if (typeof logger === 'function') logger('setSingle: ' + etc[0])
  }
  if (msg === 'setMulti') {
    if (typeof logger !== 'function') console.log('setMulti: ', ...etc[0])
    if (typeof logger === 'function') logger('setMulti: ' + JSON.stringify(etc[0]))
  }
  if (msg === 'get') {
    if (typeof logger !== 'function') console.log('Get: ', ...etc[0])
    if (typeof logger === 'function') logger('Get: ' + JSON.stringify(etc[0]))
  }
  if (msg === 'destroy') {
    if (logger && typeof logger !== 'function') console.log('Destroy: ', ...etc[0])
    if (logger && typeof logger === 'function') logger('Destroy: ' + JSON.stringify(etc[0]))
  }
}

// TODO: OBJECT REPLACES
const addToStore = (args) => new Promise((resolve, reject) => {
  MainStore.props.props.addToReduxStore(args)
  resolve()
})

// #endregion

// Reconnect after 'online' on browser
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (server && testing) io.connect(serverAddress)
    else if (server) socket = io.connect()
  })
}
