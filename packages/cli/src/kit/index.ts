import chalk from 'chalk';
import { shell } from './shell';
import { createStore } from './store';
import { printTable } from './table';
import { ui } from './ui';

export const kit = {
  ...ui,
  ...shell,
  printTable,
  createStore,
  chalk,
};
