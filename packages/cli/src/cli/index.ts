import { buildProgram } from './program';
import { runMenu } from './menu';
import './defines';

export const program = buildProgram();

export async function RunCli(): Promise<void> {
  await runMenu();
}

export default RunCli;
