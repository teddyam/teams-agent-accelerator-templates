import log from 'loglevel';
import chalk from 'chalk';

log.setLevel('info');

const originalFactory = log.methodFactory;
log.methodFactory = (methodName, logLevel, loggerName) => {
    const rawMethod = originalFactory(methodName, logLevel, loggerName);
    return (...args) => {
        const color = logLevel === log.levels.INFO ? chalk.blue :
                      logLevel === log.levels.WARN ? chalk.yellow :
                      logLevel === log.levels.ERROR ? chalk.red : chalk.white;
        rawMethod(color(`[${methodName.toUpperCase()}]`), ...args);
    };
};

log.enableAll();

export default log;
