import { KeyValuePair } from './data';

export interface Plugin {
  id: PluginID;
  name: PluginName;
  requiredKeys: KeyValuePair[];
}

export interface PluginKey {
  pluginId: PluginID;
  requiredKeys: KeyValuePair[];
}

export enum PluginID {
  GOOGLE_SEARCH = 'google-search',
  CHECK_LIST = 'check-list',
  TC = 'Hawkeye_Testcase',
  FILE = 'file',
  MAIL = 'mail',
  NONE = 'none',
}

export enum PluginName {
  GOOGLE_SEARCH = 'Google Search',
  CHECK_LIST = 'Hawkeye Check List',
  TC = 'Hawkeye Testcase',
  FILE = 'Talk File',
  MAIL = 'E_Mail',
  NONE = 'none',
}

export const plugin_null : Plugin = {
  id: PluginID.NONE,
  name: PluginName.NONE,
  requiredKeys: [],
};

export const Plugins: Record<PluginID, Plugin> = {
  [PluginID.GOOGLE_SEARCH]: {
    id: PluginID.GOOGLE_SEARCH,
    name: PluginName.GOOGLE_SEARCH,
    requiredKeys: [
      {
        key: 'GOOGLE_API_KEY',
        value: '',
      },
      {
        key: 'GOOGLE_CSE_ID',
        value: '',
      },
    ],
  },
  [PluginID.CHECK_LIST]: {
    id: PluginID.CHECK_LIST,
    name: PluginName.CHECK_LIST,
    requiredKeys: [
    ],
  },
  [PluginID.TC]: {
    id: PluginID.TC,
    name: PluginName.TC,
    requiredKeys: [
    ],
  },
  [PluginID.MAIL]: {
    id: PluginID.MAIL,
    name: PluginName.MAIL,
    requiredKeys: [
    ],
  },
  
  [PluginID.FILE]: {
    id: PluginID.FILE,
    name: PluginName.FILE,
    requiredKeys: [
      {
        key: 'filename',
        value: '',
      },
    ],
  },
};

export const PluginList = Object.values(Plugins);
