import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';

import 'react-tabs/style/react-tabs.css';
import { App } from './pages/App';

ReactDOM.render(
  <div>
    <Tabs>
      <TabList>
        <Tab>Carousel</Tab>
        <Tab>完整实例</Tab>
      </TabList>

      <TabPanel>
        <App />
      </TabPanel>
      <TabPanel></TabPanel>
    </Tabs>
  </div>,
  document.getElementById('root')
);
