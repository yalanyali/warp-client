"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WarpGate = WarpGate;
exports.emit = exports.run = exports.getCache = exports.isOfflineCacheEmpty = exports.unsubscribe = exports.removeFromDatabase = exports.removeLocal = exports.load = exports.save = exports.get = exports.set = exports.subscribeLocal = exports.subscribeServer = exports.getStore = exports.getStoreComponent = void 0;

var _react = _interopRequireWildcard(require("react"));

var _socket = _interopRequireDefault(require("socket.io-client"));

var _redux = require("redux");

var _reactRedux = require("react-redux");

var _reduxDevtoolsExtension = require("redux-devtools-extension");

var _v = _interopRequireDefault(require("uuid/v4"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function _getRequireWildcardCache() { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

// #region
var cache = {};
var subscriptions = {};
var MainStore;
var socket;
var serverAddress;
var server = false;
var logger = false;
var providerStore;
var initialStore = false;
var testing = false; // #endregion
// #region : REDUX STORE

var _addToReduxStore = function addToReduxStore(object) {
  return {
    type: Object.keys(object)[0],
    payload: object
  };
};

var _deleteFromReduxStore = function deleteFromReduxStore(key) {
  return {
    type: 'DESTROY: ' + key,
    payload: key
  };
};

var mapStateToProps = function mapStateToProps(store) {
  return {
    reduxStore: store.reduxStore
  };
};

var mapDispatchToProps = function mapDispatchToProps(dispatch) {
  return {
    addToReduxStore: function addToReduxStore(object) {
      return dispatch(_addToReduxStore(object));
    },
    deleteFromReduxStore: function deleteFromReduxStore(object) {
      return dispatch(_deleteFromReduxStore(object));
    }
  };
};

var newState;

var storeReducer = function storeReducer() {
  var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var action = arguments.length > 1 ? arguments[1] : undefined;

  switch (action.type.slice(0, 7)) {
    case 'DESTROY':
      newState = Object.assign({}, state);
      delete newState[action.payload];
      return newState;

    default:
      return Object.assign({}, state, action.payload);
  }
};

var reducers = (0, _redux.combineReducers)({
  reduxStore: storeReducer
});

var WarpStore =
/*#__PURE__*/
function (_Component) {
  _inherits(WarpStore, _Component);

  function WarpStore() {
    _classCallCheck(this, WarpStore);

    return _possibleConstructorReturn(this, _getPrototypeOf(WarpStore).apply(this, arguments));
  }

  _createClass(WarpStore, [{
    key: "UNSAFE_componentWillMount",
    value: function UNSAFE_componentWillMount() {
      // eslint-disable-line
      // Call Redux action creator with initial store passed in by client
      if (initialStore) this.props.props.addToReduxStore(this.props.props.props.initialStore);
    }
  }, {
    key: "render",
    value: function render() {
      // If an initial store was provided, wait for it to be set in Redux before rendering
      if (initialStore && Object.keys(this.props.props.reduxStore).length === 0) return _react["default"].createElement("div", null);else return this.props.props.props.children;
    }
  }]);

  return WarpStore;
}(_react.Component);

var _ReduxWrapper =
/*#__PURE__*/
function (_Component2) {
  _inherits(_ReduxWrapper, _Component2);

  function _ReduxWrapper() {
    _classCallCheck(this, _ReduxWrapper);

    return _possibleConstructorReturn(this, _getPrototypeOf(_ReduxWrapper).apply(this, arguments));
  }

  _createClass(_ReduxWrapper, [{
    key: "renderStore",
    // Setting a reference to a React component so its props (Redux store and methods) can be accessed
    value: function renderStore() {
      MainStore = _react["default"].createElement(WarpStore, {
        props: this.props
      });
      return MainStore;
    }
  }, {
    key: "render",
    value: function render() {
      return this.renderStore();
    }
  }]);

  return _ReduxWrapper;
}(_react.Component);

var ReduxWrapper = (0, _reactRedux.connect)(mapStateToProps, mapDispatchToProps)(_ReduxWrapper);

var ProviderWrapper =
/*#__PURE__*/
function (_Component3) {
  _inherits(ProviderWrapper, _Component3);

  function ProviderWrapper() {
    _classCallCheck(this, ProviderWrapper);

    return _possibleConstructorReturn(this, _getPrototypeOf(ProviderWrapper).apply(this, arguments));
  }

  _createClass(ProviderWrapper, [{
    key: "render",
    value: function render() {
      return _react["default"].createElement(_reactRedux.Provider, {
        store: providerStore
      }, _react["default"].createElement(ReduxWrapper, {
        props: this.props
      }));
    }
  }]);

  return ProviderWrapper;
}(_react.Component); // Returns main ProviderWrapper after initial setup (prop options)


function WarpGate(props) {
  // Initial setup
  initialStore = props.hasOwnProperty('initialStore');
  if (props.logger && typeof props.logger !== 'function') logger = true;
  if (props.logger && typeof props.logger === 'function') logger = props.logger;

  if (props.devTools && props.devTools === true) {
    providerStore = (0, _redux.createStore)(reducers, (0, _reduxDevtoolsExtension.composeWithDevTools)());
  } else providerStore = (0, _redux.createStore)(reducers);

  if (props.serverAddress) {
    testing = true;
    serverAddress = props.serverAddress;
  }

  return new ProviderWrapper(props);
}

WarpGate.prototype = _react["default"].Component.prototype; // FALAN
// #endregion
// #region : USER FUNCTIONS

var getStoreComponent = function getStoreComponent() {
  return MainStore;
};

exports.getStoreComponent = getStoreComponent;

var getStore = function getStore() {
  return MainStore.props.props.reduxStore;
};

exports.getStore = getStore;

var subscribeServer = function subscribeServer(key, fn) {
  if (!server) setupSocket();
  if (logger) logHelper('subscribe', key);
  var actionId = (0, _v["default"])();
  cache[actionId] = {
    method: 'subscribe',
    key: key,
    actionId: actionId
  };
  socket.emit('subscribe', {
    key: key
  }); // Add the callback that will be called later to the 'subscriptions' object

  addSubscription(key, actionId, fn);
};

exports.subscribeServer = subscribeServer;

var subscribeLocal = function subscribeLocal(key, fn) {
  if (logger) logHelper('subscribeLocal', key);
  var actionId = (0, _v["default"])(); // Add the callback that will be called later to the 'subscriptions' object

  addSubscription(key, actionId, fn);
};

exports.subscribeLocal = subscribeLocal;

var set = function set() {
  var _len,
      args,
      _key,
      keysToNotify,
      i,
      _args = arguments;

  return regeneratorRuntime.async(function set$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          for (_len = _args.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = _args[_key];
          }

          if (!(args.length === 1 && _typeof(args[0]) === 'object')) {
            _context.next = 8;
            break;
          }

          // Set with an object
          if (logger) logHelper('setSingle', args[0]);
          _context.next = 5;
          return regeneratorRuntime.awrap(addToStore(args[0]));

        case 5:
          notifyLocalUpdates(Object.keys(args[0]));
          _context.next = 24;
          break;

        case 8:
          // Set with ...args
          if (logger) logHelper('setMulti', args);
          keysToNotify = [];
          i = 0;

        case 11:
          if (!(i < args.length)) {
            _context.next = 23;
            break;
          }

          if (!(i + 1 === args.length)) {
            _context.next = 17;
            break;
          }

          _context.next = 15;
          return regeneratorRuntime.awrap(addToStore(_defineProperty({}, args[i], null)));

        case 15:
          _context.next = 19;
          break;

        case 17:
          _context.next = 19;
          return regeneratorRuntime.awrap(addToStore(_defineProperty({}, args[i], args[i + 1])));

        case 19:
          keysToNotify.push(args[i]);

        case 20:
          i = i + 2;
          _context.next = 11;
          break;

        case 23:
          notifyLocalUpdates(keysToNotify);

        case 24:
        case "end":
          return _context.stop();
      }
    }
  });
};

exports.set = set;

var get = function get() {
  for (var _len2 = arguments.length, keys = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
    keys[_key2] = arguments[_key2];
  }

  if (logger) logHelper('get', keys); // Returns the entire store if no arguments are provided

  if (keys.length === 0) return MainStore.props.props.reduxStore;else if (keys.length > 1) {
    var results = {};
    keys.forEach(function (key) {
      results[key] = MainStore.props.props.reduxStore[key];
    });
    return results;
  } else return MainStore.props.props.reduxStore[keys[0]];
};

exports.get = get;

var save = function save() {
  for (var _len3 = arguments.length, args = new Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
    args[_key3] = arguments[_key3];
  }

  if (args.length === 1 && _typeof(args[0]) === 'object') {
    // Set with an object
    if (logger) logHelper('saveSingle', args[0]);
    return new Promise(function (resolve, reject) {
      run('set', args[0]).then(function (res) {
        resolve(res);
      })["catch"](function (err) {
        reject(err);
      });
    });
  } else {
    // Set with ...args
    if (logger) logHelper('saveMulti', args);

    var _loop = function _loop(i) {
      if (i + 1 === args.length) {
        return {
          v: new Promise(function (resolve, reject) {
            run('set', _defineProperty({}, args[i], null)).then(function (res) {
              resolve(res);
            })["catch"](function (err) {
              reject(err);
            });
          })
        };
      } else {
        return {
          v: new Promise(function (resolve, reject) {
            run('set', _defineProperty({}, args[i], args[i + 1])).then(function (res) {
              resolve(res);
            })["catch"](function (err) {
              reject(err);
            });
          })
        };
      }
    };

    for (var i = 0; i < args.length; i = i + 2) {
      var _ret = _loop(i);

      if (_typeof(_ret) === "object") return _ret.v;
    }
  }
};

exports.save = save;

var load = function load() {
  for (var _len4 = arguments.length, keys = new Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
    keys[_key4] = arguments[_key4];
  }

  if (logger) logHelper('get', keys); // Returns the entire database if no arguments are provided

  if (keys.length === 0) {
    return new Promise(function (resolve, reject) {
      run('getAll').then(function (res) {
        resolve(res);
      })["catch"](function (err) {
        reject(err);
      });
    });
  } else if (keys.length > 0) {
    return new Promise(function (resolve, reject) {
      run('get', keys).then(function (res) {
        resolve(res);
      })["catch"](function (err) {
        reject(err);
      });
    });
  }
};

exports.load = load;

var removeLocal = function removeLocal() {
  for (var _len5 = arguments.length, keys = new Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
    keys[_key5] = arguments[_key5];
  }

  if (logger) logHelper('destroy', keys);
  keys.forEach(function (key) {
    return MainStore.props.props.deleteFromReduxStore(key);
  });
};

exports.removeLocal = removeLocal;

var removeFromDatabase = function removeFromDatabase() {
  for (var _len6 = arguments.length, keys = new Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
    keys[_key6] = arguments[_key6];
  }

  if (logger) logHelper('destroy', keys);

  if (keys.length > 0) {
    return new Promise(function (resolve, reject) {
      run('delete', keys).then(function (res) {
        resolve(res);
      })["catch"](function (err) {
        reject(err);
      });
    });
  } else {
    return new Promise(function (resolve, reject) {
      run('deleteAll', {}).then(function (res) {
        resolve(res);
      })["catch"](function (err) {
        reject(err);
      });
    });
  }
};

exports.removeFromDatabase = removeFromDatabase;

var unsubscribe = function unsubscribe(key) {
  if (!server) setupSocket();
  if (logger) logHelper('unsubscribe', key);
  var actionId = (0, _v["default"])();
  cache[actionId] = {
    method: 'unsubscribe',
    key: key,
    actionId: actionId
  };
  socket.emit('unsubscribe', {
    key: key,
    actionId: actionId
  });
  delete subscriptions[key];
};

exports.unsubscribe = unsubscribe;

var isOfflineCacheEmpty = function isOfflineCacheEmpty() {
  return Object.keys(cache).length === 0;
};

exports.isOfflineCacheEmpty = isOfflineCacheEmpty;

var getCache = function getCache() {
  return cache;
}; // #endregion
// #region : MAIN FUNCTIONS


exports.getCache = getCache;

var run = function run(keys, request) {
  if (!Array.isArray(keys)) keys = [keys];
  if (!server) setupSocket();
  var actionId = (0, _v["default"])();
  if (logger) logHelper('run', keys, request, actionId);
  socket.emit('run', {
    keys: keys,
    request: request,
    actionId: actionId,
    socketID: socket.id
  }); // Will be called when the server responds

  return new Promise(function (resolve, reject) {
    cache[actionId] = {
      method: 'query',
      keys: keys,
      request: request,
      actionId: actionId,
      resolve: resolve,
      reject: reject,
      socketID: socket.id
    };
  });
};

exports.run = run;

var emit = function emit(key, request) {
  if (!server) setupSocket();
  var actionId = (0, _v["default"])();
  if (logger) logHelper('emit', key, request, actionId);
  socket.emit('emit', {
    key: key,
    request: request,
    actionId: actionId,
    socketID: socket.id
  }); // Pass the resolve and reject functions from the promise
  // to the cache so they can be called when the server responds

  return new Promise(function (resolve, reject) {
    cache[actionId] = {
      method: 'query',
      key: key,
      request: request,
      actionId: actionId,
      resolve: resolve,
      reject: reject,
      socketID: socket.id
    };
  });
};

exports.emit = emit;

var notifyLocalUpdates = function notifyLocalUpdates(keys) {
  keys.filter(function (key) {
    return subscriptionExists(key);
  }).forEach(function (key) {
    var val = MainStore.props.props.reduxStore[key]; // Run all subscribed functions

    Object.values(subscriptions[key]).forEach(function (fn) {
      fn(val);
    });
  });
};

var addSubscription = function addSubscription(key, actionId, fn) {
  if (subscriptionExists(key)) {
    var sub = subscriptions[key];
    sub[actionId] = fn;
  } else {
    subscriptions[key] = _defineProperty({}, actionId, fn);
  }
}; // Called only when a server needed


var setupSocket = function setupSocket() {
  server = true;
  if (testing) socket = _socket["default"].connect(serverAddress);else socket = _socket["default"].connect(); // Always check the cache for pending requests
  // on a socket connection/reconnection

  socket.on('connect', function () {
    Object.values(cache).forEach(function (x) {
      if (x.method === 'query') socket.emit(x.method, {
        key: x.key,
        request: x.request,
        actionId: x.actionId,
        socketID: x.socketID
      });
      if (x.method === 'subscribe' || x.method === 'unsubscribe') socket.emit(x.method, {
        key: x.key,
        actionId: x.actionId
      });
    });
  });
  socket.on('response', function (data) {
    var actionId = data.actionId;
    var response = data.response; // If multiple actions are run at once (i.e. run([__, __]) an object containing each response will be returned
    // Each response in the returned object will have the same action id
    // If the object from the server doesn't have an actionId on its first level, we know
    // multiple actions were ran in a 'run' method and the object must be parsed a bit first

    if (!data.hasOwnProperty('actionId')) {
      var keys = Object.keys(data);
      actionId = data[keys[0]].actionId;
      keys.forEach(function (key) {
        if (data[key].preError) data[key] = data[key].preError;else if (data[key].databaseError) data[key] = data[key].databaseError;else if (data[key].actionError) data[key] = data[key].actionError;else if (data[key].keyError) data[key] = data[key].keyError;else data[key] = data[key].response;
      });
      response = data;
    } // If any errors are on the object, reject the promise
    // Otherwise resolve and delete it out of cache


    if (cache[actionId]) {
      if (data.preError) cache[actionId].reject(data.preError);else if (data.databaseError) cache[actionId].reject(data.databaseError);else if (data.actionError) cache[actionId].reject(data.actionError);else if (data.keyError) cache[actionId].reject(data.keyError);else cache[actionId].resolve(response);
      delete cache[actionId];
    }
  }); // On a response from the server for a subscribed socket,
  // call the function that was passed into the 'on' method

  socket.on('subscription', function (updatedPair) {
    console.log('SUBSCRIPTION EVENT:', updatedPair);
    Object.values(subscriptions[updatedPair.key]).forEach(function (fn) {
      fn(updatedPair.value);
    });
  }); // Take the action out of the cache whenever the
  // server successfully completed its task
  // socket.on('emitOnUnsubscribeResponse', data => {
  //   delete cache[data.actionId]
  // })
}; // #endregion
// #region : UTILITY FUNCTIONS


var subscriptionExists = function subscriptionExists(key) {
  return subscriptions.hasOwnProperty(key);
};

var logHelper = function logHelper(msg) {
  if (msg === 'run') {
    var request;
    (arguments.length <= 1 ? undefined : arguments[1]) ? request = arguments.length <= 2 ? undefined : arguments[2] : request = 'none';

    if (typeof logger !== 'function') {
      console.log('Run: ', arguments.length <= 1 ? undefined : arguments[1], '\nRequest: ', request, '\nID: ', arguments.length <= 3 ? undefined : arguments[3]);
    }

    ;

    if (typeof logger === 'function') {
      logger('Run: ' + (arguments.length <= 1 ? undefined : arguments[1]) + 'Request: ' + request + 'ID: ' + (arguments.length <= 3 ? undefined : arguments[3]));
    }

    ;
  }

  if (msg === 'on') {
    if (typeof logger !== 'function') console.log('On: ', arguments.length <= 1 ? undefined : arguments[1]);
    if (typeof logger === 'function') logger('On: ' + (arguments.length <= 1 ? undefined : arguments[1]));
  }

  if (msg === 'subscribe') {
    if (typeof logger !== 'function') console.log('Subscribe: ', arguments.length <= 1 ? undefined : arguments[1]);
    if (typeof logger === 'function') logger('Subscribe: ' + (arguments.length <= 1 ? undefined : arguments[1]));
  }

  if (msg === 'unsubscribe') {
    if (typeof logger !== 'function') console.log('Unsubscribe: ', arguments.length <= 1 ? undefined : arguments[1]);
    if (typeof logger === 'function') logger('Unsubscribe: ' + (arguments.length <= 1 ? undefined : arguments[1]));
  }

  if (msg === 'emit') {
    var _request;

    !(arguments.length <= 2 ? undefined : arguments[2]) ? _request = 'none' : _request = arguments.length <= 2 ? undefined : arguments[2];

    if (logger && typeof logger !== 'function') {
      console.log('Emit: ', arguments.length <= 1 ? undefined : arguments[1], '\nRequest: ', _request, '\nID: ', arguments.length <= 3 ? undefined : arguments[3]);
    }

    ;

    if (logger && typeof logger === 'function') {
      logger('Emit: ' + (arguments.length <= 1 ? undefined : arguments[1]) + 'Request: ' + _request + 'ID: ' + (arguments.length <= 3 ? undefined : arguments[3]));
    }

    ;
  }

  if (msg === 'setSingle') {
    if (typeof logger !== 'function') console.log('setSingle: ', arguments.length <= 1 ? undefined : arguments[1]);
    if (typeof logger === 'function') logger('setSingle: ' + (arguments.length <= 1 ? undefined : arguments[1]));
  }

  if (msg === 'setMulti') {
    var _console;

    if (typeof logger !== 'function') (_console = console).log.apply(_console, ['setMulti: '].concat(_toConsumableArray(arguments.length <= 1 ? undefined : arguments[1])));
    if (typeof logger === 'function') logger('setMulti: ' + JSON.stringify(arguments.length <= 1 ? undefined : arguments[1]));
  }

  if (msg === 'get') {
    var _console2;

    if (typeof logger !== 'function') (_console2 = console).log.apply(_console2, ['Get: '].concat(_toConsumableArray(arguments.length <= 1 ? undefined : arguments[1])));
    if (typeof logger === 'function') logger('Get: ' + JSON.stringify(arguments.length <= 1 ? undefined : arguments[1]));
  }

  if (msg === 'destroy') {
    var _console3;

    if (logger && typeof logger !== 'function') (_console3 = console).log.apply(_console3, ['Destroy: '].concat(_toConsumableArray(arguments.length <= 1 ? undefined : arguments[1])));
    if (logger && typeof logger === 'function') logger('Destroy: ' + JSON.stringify(arguments.length <= 1 ? undefined : arguments[1]));
  }
}; // TODO: OBJECT REPLACES


var addToStore = function addToStore(args) {
  return new Promise(function (resolve, reject) {
    MainStore.props.props.addToReduxStore(args);
    resolve();
  });
}; // #endregion
// Reconnect after 'online' on browser


if (typeof window !== 'undefined') {
  window.addEventListener('online', function () {
    if (server && testing) _socket["default"].connect(serverAddress);else if (server) socket = _socket["default"].connect();
  });
}
