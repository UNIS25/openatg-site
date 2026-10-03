import platform from '../platform/eslint.config.mjs';
export default [...platform, {rules: {'@next/next/no-page-custom-font': 'off', '@next/next/no-head-element': 'off'}}];
