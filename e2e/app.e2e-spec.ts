import { AngularReduxStorePage } from './app.po';

describe('angular-redux-store App', () => {
  let page: AngularReduxStorePage;

  beforeEach(() => {
    page = new AngularReduxStorePage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
