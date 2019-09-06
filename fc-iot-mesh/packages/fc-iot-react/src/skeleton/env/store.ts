import { routerMiddleware } from 'connected-react-router';
import { applyMiddleware, createStore, compose, ReducersMapObject } from 'redux';
import { middleware as reduxPackMiddleware } from 'redux-pack-fsa';
import thunkMiddleware from 'redux-thunk';

import { configReducer } from '../../ducks';
import { history } from './history';

declare let isProd: boolean;
declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__?: Function;
  }
}

const middlewares = applyMiddleware(
  routerMiddleware(history),
  thunkMiddleware,
  reduxPackMiddleware
);

let enhancers = middlewares;

if (!isProd) {
  const composeEnhancers =
    typeof window === 'object' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
      ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
      : compose;

  enhancers = composeEnhancers(middlewares);
}

export function configStore(initialState: object = {}) {
  const store = createStore(configReducer({})(history), initialState, enhancers);

  function appendReducer(asyncReducers: ReducersMapObject) {
    store.replaceReducer(configReducer(asyncReducers)(history));
  }

  return {
    ...store,
    appendReducer
  };
}

export default configStore();
