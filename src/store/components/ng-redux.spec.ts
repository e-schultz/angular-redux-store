// import 'reflect-metadata';
// import 'es6-shim';
import { NgZone } from '@angular/core';
// import { expect, use } from 'chai';
import { createStore } from 'redux';

// import * as sinon from 'sinon';
// import * as sinonChai from 'sinon-chai';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/combineLatest';

import { NgRedux } from './ng-redux';
import { select } from '../decorators/select';

// use(sinonChai);

function returnPojo() {
  return {};
}

class MockNgZone {
  run(fn) {
    return fn();
  }
}

describe('NgRedux Observable Store', () => {
  interface IAppState {
    foo: string;
    bar: string;
    baz: number;
  };

  // const targetObj;
  let defaultState;
  let rootReducer;
  let store;
  let ngRedux;
  const mockNgZone = new MockNgZone() as NgZone;

  beforeEach(() => {
    defaultState = {
      foo: 'bar',
      bar: 'foo',
      baz: -1,
    };

    rootReducer = (state = defaultState, action) => {
      switch (action.type) {
        case 'UPDATE_FOO':
          return Object.assign({}, state, { foo: action.payload });
        case 'UPDATE_BAZ':
          return Object.assign({}, state, { baz: action.payload });
        case 'UPDATE_BAR':
          return Object.assign({}, state, { bar: action.payload });
        default:
          return state;
      }
    };

    store = createStore(rootReducer);
    ngRedux = new NgRedux<IAppState>(mockNgZone);
    ngRedux.configureStore(rootReducer, defaultState);
  });

  it('should throw when the store is configured twice', () => {
    // Configured once in beforeEach, now we try to configure
    // it a second time.
    expect(ngRedux.configureStore.bind(ngRedux, rootReducer, defaultState))
    .toThrowError('Store already configured!');
  });

  it('should get the initial state', (done) => {
    const state$ = ngRedux
      .select()
      .subscribe(state => {
        expect(state.foo).toEqual('bar');
        expect(state.baz).toEqual(-1);
        done();
      });
  });

  it('should accept a keyname for a selector', (done) => {
    const foo$ = ngRedux
      .select('foo')
      .subscribe(stateSlice => {
        expect(stateSlice).toEqual('bar');
        done();
      });
  });

  it('should not trigger a selector if that slice of state was not changed',
    (): void => {
      let fooData;

      const spy = jasmine.createSpy('spy', (foo) => fooData = foo).and.callThrough();
      const foo$ = ngRedux
        .select('foo')
        .subscribe(spy);
      console.log(ngRedux.getState());
      ngRedux.dispatch({ type: 'UPDATE_BAR', payload: 0 });

      expect(spy).toHaveBeenCalledTimes(1);

      expect(fooData).toEqual('bar');
      ngRedux.dispatch({ type: 'UPDATE_FOO', payload: 'changeFoo' });
      expect(spy).toHaveBeenCalledTimes(2);
      expect(fooData).toEqual('changeFoo');
      foo$.unsubscribe();
    });

  it('should not trigger a selector if the action payload is the same',
    (): void => {
      let fooData;
      const spy = jasmine.createSpy('spy', (foo) => fooData = foo).and.callThrough();

      const foo$ = ngRedux
        .select('foo')
        .subscribe(spy);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(fooData).toEqual('bar');

      ngRedux.dispatch({ type: 'UPDATE_FOO', payload: 'bar' });
      expect(spy).toHaveBeenCalledTimes(1);
      expect(fooData).toEqual('bar');
      foo$.unsubscribe();
    });

  it('should not call the sub if the result of the function is the same',
    () => {
      let fooData;
      // let spy = sinon.spy((foo) => { fooData = foo; });
      const spy = jasmine.createSpy('spy', (foo) => fooData = foo).and.callThrough();
      const foo$ = ngRedux
        .select(state => `${state.foo}-${state.baz}`)
        .subscribe(spy);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(fooData).toEqual('bar--1');

      expect(spy).toHaveBeenCalledTimes(1);
      expect(fooData).toEqual('bar--1');

      ngRedux.dispatch({ type: 'UPDATE_BAR', payload: 'bar' });
      expect(spy).toHaveBeenCalledTimes(1);
      expect(fooData).toEqual('bar--1');

      ngRedux.dispatch({ type: 'UPDATE_FOO', payload: 'update' });
      expect(fooData).toEqual('update--1');
      expect(spy).toHaveBeenCalledTimes(2);

      ngRedux.dispatch({ type: 'UPDATE_BAZ', payload: 2 });
      expect(fooData).toEqual('update-2');
      expect(spy).toHaveBeenCalledTimes(3);
    });

  it(`should accept a custom compare function`, () => {
    let fooData;
    //    let spy = sinon.spy((foo) => { fooData = foo; });
    const spy = jasmine.createSpy('spy', (foo) => fooData = foo).and.callThrough();
    const cmp = (a, b) => a.data === b.data;

    const foo$ = ngRedux
      .select(state => ({ data: `${state.foo}-${state.baz}` }), cmp)
      .subscribe(spy);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(fooData.data).toEqual('bar--1');

    ngRedux.dispatch({ type: 'UPDATE_BAR', payload: 'bar' });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(fooData.data).toEqual('bar--1');

    ngRedux.dispatch({ type: 'UPDATE_FOO', payload: 'update' });
    expect(fooData.data).toEqual('update--1');
    expect(spy).toHaveBeenCalledTimes(2);

    ngRedux.dispatch({ type: 'UPDATE_BAZ', payload: 2 });
    expect(fooData.data).toEqual('update-2');
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('should throw when the store is provided after it has been configured',
    () => {
      // Configured once in beforeEach, now we try to provide a store when
      // we already have configured one.

      expect(ngRedux.provideStore.bind(ngRedux, store)).toThrowError('Store already configured!');
    });

  it('should set the store when a store is provided',
    () => {

      delete ngRedux._store;
      delete ngRedux._$store;

      expect(ngRedux._store).toBeUndefined();
      expect(ngRedux._$store).toBeUndefined();

      expect(ngRedux.provideStore.bind(ngRedux, store)).not.toThrow(Error);


      expect(ngRedux._store.dispatch).toBeDefined();
      expect(ngRedux._store.subscribe).toBeDefined();
      expect(ngRedux._store.getState).toBeDefined();
      expect(ngRedux._store.replaceReducer).toBeDefined();

    });

  it('should wait until store is configured before emitting values',
    () => {
      class SomeService {
        foo: string;
        bar: string;
        baz: number;

        constructor(private _ngRedux: NgRedux<any>) {
          _ngRedux.select(n => n.foo).subscribe(foo => this.foo = foo);
          _ngRedux.select(n => n.bar).subscribe(bar => this.bar = bar);
          _ngRedux.select(n => n.baz).subscribe(baz => this.baz = baz);
        }
      }
      ngRedux = new NgRedux<IAppState>(mockNgZone);

      const someService = new SomeService(ngRedux);
      ngRedux.configureStore(rootReducer, defaultState);
      expect(someService.foo).toEqual('bar');
      expect(someService.bar).toEqual('foo');
      expect(someService.baz).toEqual(-1);

    });

  it('should have select decorators work before store is configured',
    (done) => {
      class SomeService {
        @select() foo$: any;
        @select() bar$: any;
        @select() baz$: any;
      }

      ngRedux = new NgRedux<IAppState>(mockNgZone);

      const someService = new SomeService();
      someService
        .foo$
        .combineLatest(someService.bar$, someService.baz$)
        .subscribe(([foo, bar, baz]) => {
          expect(foo).toEqual('bar');
          expect(bar).toEqual('foo');
          expect(baz).toEqual(-1);
          done();
        });

      ngRedux.configureStore(rootReducer, defaultState);

    });
});

describe('Chained actions in subscriptions', () => {
  interface IAppState {
    keyword: string;
    keywordLength: number;
  };

  let defaultState: IAppState;
  let rootReducer;
  let ngRedux;
  const mockNgZone = new MockNgZone() as NgZone;

  const doSearch = (word) => {
    ngRedux.dispatch({ type: 'SEARCH', payload: word });
  };

  const doFetch = (word) => {
    ngRedux.dispatch({ type: 'SEARCH_RESULT', payload: word.length });
  };

  beforeEach(() => {
    defaultState = {
      keyword: '',
      keywordLength: -1
    };

    rootReducer = (state = defaultState, action) => {
      switch (action.type) {
        case 'SEARCH':
          return Object.assign({}, state, { keyword: action.payload });
        case 'SEARCH_RESULT':
          return Object.assign({}, state, { keywordLength: action.payload });
        default:
          return state;
      }
    };

    ngRedux = new NgRedux<IAppState>(mockNgZone);
    ngRedux.configureStore(rootReducer, defaultState);
  });


  describe('dispatching an action in a keyword$ before length$ happens', () => {
    it(`length sub should be called twice`, () => {

      const keyword$ = ngRedux.select(n => n.keyword);
      let keyword = '';
      let length;
      const length$ = ngRedux.select(n => n.keywordLength);
      const lengthSpy = jasmine.createSpy('lenSpy', (n) => length = n).and.callThrough(); // sinon.spy((n) => length = n);
      let lenSub;
      let keywordSub;
      keywordSub = keyword$.
        filter(n => n !== '')
        .subscribe(n => {
          keyword = n;
          doFetch(n);
        });

      lenSub = length$.subscribe(lengthSpy);

      expect(keyword).toEqual('');
      expect(length).toEqual(-1);

      expect(lengthSpy).toHaveBeenCalledTimes(1);

      doSearch('test');

      expect(lengthSpy).toHaveBeenCalledTimes(2);

      expect(keyword).toEqual('test');
      expect(length).toEqual(4);
      keywordSub.unsubscribe();
      lenSub.unsubscribe();
    });

    it(`second sub should get most current state value`, () => {

      const keyword$ = ngRedux.select(n => n.keyword);
      let keyword = '';
      let length;
      const length$ = ngRedux.select(n => n.keywordLength);
      const lengthSpy = jasmine.createSpy('lenSpy', (n) => length = n).and.callThrough();
      let lenSub;
      let keywordSub;
      keywordSub = keyword$.
        filter(n => n !== '')
        .subscribe(n => {
          keyword = n;
          doFetch(n);
        });

      lenSub = length$.subscribe(lengthSpy);

      expect(keyword).toEqual('');
      expect(length).toEqual(-1);

      expect(lengthSpy).toHaveBeenCalledTimes(1);

      doSearch('test');

      expect(keyword).toEqual('test');
      expect(length).toEqual(4);
      keywordSub.unsubscribe();
      lenSub.unsubscribe();
    });
  });

  describe('dispatching an action in a keyword$ after length$ happens', () => {
    it(`length sub should be called twice`, () => {

      const keyword$ = ngRedux.select(n => n.keyword);
      let keyword = '';
      let length;
      const length$ = ngRedux.select(n => n.keywordLength);
      const lengthSpy = jasmine.createSpy('lenSpy', (n) => length = n).and.callThrough();
      let lenSub;
      let keywordSub;

      lenSub = length$.subscribe(lengthSpy);
      keywordSub = keyword$.
        filter(n => n !== '')
        .subscribe(n => {
          keyword = n;
          doFetch(n);
        });



      expect(keyword).toEqual('');
      expect(length).toEqual(-1);

      expect(lengthSpy).toHaveBeenCalledTimes(1);

      doSearch('test');

      expect(lengthSpy).toHaveBeenCalledTimes(2);

      expect(keyword).toEqual('test');
      expect(length).toEqual(4);
      keywordSub.unsubscribe();
      lenSub.unsubscribe();
    });

    it(`first sub should get most current state value`, () => {

      const keyword$ = ngRedux.select(n => n.keyword);
      let keyword = '';
      let length;
      const length$ = ngRedux.select(n => n.keywordLength);
      const lengthSpy = jasmine.createSpy('lenSpy', (n) => length = n).and.callThrough();
      let lenSub;
      let keywordSub;
      lenSub = length$.subscribe(lengthSpy);
      keywordSub = keyword$.
        filter(n => n !== '')
        .subscribe(n => {
          keyword = n;
          doFetch(n);
        });



      expect(keyword).toEqual('');
      expect(length).toEqual(-1);

      expect(lengthSpy).toHaveBeenCalledTimes(1);

      doSearch('test');

      expect(keyword).toEqual('test');
      expect(length).toEqual(4);
      keywordSub.unsubscribe();
      lenSub.unsubscribe();
    });
  });


});
