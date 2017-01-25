// @flow

'use strict'

import React from 'react'
import ReactDOM from 'react-dom'
import { AppContainer } from 'react-hot-loader'
import { Provider } from 'react-redux'
import { compose, applyMiddleware, createStore } from 'redux'
import createLogger from 'redux-logger'
import horizonRedux from './horizon/redux'

import {
  ADD_MESSAGE_REQUEST,
  WATCH_MESSAGES,
  watchMessages,
  newMessages,
  addMessageSuccess,
  addMessageFailure } from './actions/chat'
import rootReducer from './reducers'
import Root from './components/Root'

const hzMiddleware = horizonRedux.createMiddleware()

// Create the Redux store
const store = createStore(
  rootReducer,
  window.initialState,
  compose(
    applyMiddleware(hzMiddleware, createLogger()),
    window.devToolsExtension ? window.devToolsExtension() : f => f
  )
)

// You can add/remove actionTakers any time, even after creating the middleware.
// I've added them here for simplicity, but in a real app they could live
// wherever makes the most sense with the app's structure.

// Watch for all ADD_MESSAGE_REQUEST actions and store their payload in the
// messages table. If successful, dispatch ADD_MESSAGE_SUCCESS. If there's an
// error, dispatch ADD_MESSAGE_FAILURE and log a message to the console.
horizonRedux.takeEvery(
  ADD_MESSAGE_REQUEST,
  (horizon, action, getState) =>
    horizon('messages').store(action.payload),
  (id, action, dispatch) => {
    // the success handler for write queries doesn't occur until the write is
    // confirmed by the database, so you may see the NEW_MESSAGES action
    // get dispatched before the ADD_MESSAGE_SUCCESS action.
    dispatch(addMessageSuccess(id, action.payload))
  },
  (err, action, dispatch) => {
    console.log('failed to add message:', action.payload)
    dispatch(addMessageFailure(err, action.payload))
  }
)

// Watch for WATCH_MESSAGES action and grab the most recent messages from the
// messages table. The max number of messages to retrieve is set by the matching
// dispatched action (defaults to 10). Because we added watch(), this
// actionTaker's successHandler will get called every time new messages are added.
horizonRedux.takeLatest(
  WATCH_MESSAGES,
  (horizon, action, getState) =>
    horizon('messages').order('datetime', 'descending').limit(action.payload || 10).watch(),
  (result, action, dispatch) => {
    console.log('dispatch:', dispatch)
    dispatch(newMessages(result))
  },
  (err, action, dispatch) => {
    console.log('failed to load messages')
  }
)

// Now we can dispatch the initial action that tells horizon to watch for chat
// messages.
store.dispatch(watchMessages(10))

const appNode = document.createElement('div')
document.body.appendChild(appNode)

const renderRoot = (RootComponent) => {
  ReactDOM.render(
    <AppContainer>
      <Provider store={store}>
        <RootComponent />
      </Provider>
    </AppContainer>,
    appNode
  )
}
renderRoot(Root)

if (module.hot) {
  module.hot.accept('./components/Root', () => {
    const Root = require('./components/Root').default
    renderRoot(Root)
  })
}
