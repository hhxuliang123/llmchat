import { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useCreateReducer } from '@/hooks/useCreateReducer';

import { savePrompts } from '@/utils/app/prompts';

import { OpenAIModels } from '@/types/openai';
import { Prompt } from '@/types/prompt';

import HomeContext from '@/pages/api/home/home.context';

import { PromptFolders } from './components/PromptFolders';
import { PromptbarSettings } from './components/PromptbarSettings';
import { Prompts } from './components/Prompts';

import Sidebar from '../Sidebar';
import PromptbarContext from './PromptBar.context';
import { PromptbarInitialState, initialState } from './Promptbar.state';

import { v4 as uuidv4 } from 'uuid';

const Promptbar = () => {
  const { t } = useTranslation('promptbar');

  const promptBarContextValue = useCreateReducer<PromptbarInitialState>({
    initialState,
  });

  const {
    state: { prompts, defaultModelId, showPromptbar },
    dispatch: homeDispatch,
    handleCreateFolder,
  } = useContext(HomeContext);

  const {
    state: { searchTerm, filteredPrompts },
    dispatch: promptDispatch,
  } = promptBarContextValue;

  const handleTogglePromptbar = () => {
    homeDispatch({ field: 'showPromptbar', value: !showPromptbar });
    localStorage.setItem('showPromptbar', JSON.stringify(!showPromptbar));
  };

  const handleCreatePrompt = () => {
    if (defaultModelId) {
      const newPrompt: Prompt = {
        id: uuidv4(),
        name: `Prompt ${prompts.length + 1}`,
        description: '',
        content: '',
        model: OpenAIModels[defaultModelId],
        folderId: null,
      };

      const updatedPrompts = [...prompts, newPrompt];

      homeDispatch({ field: 'prompts', value: updatedPrompts });

      savePrompts(updatedPrompts);
    }
  };

  const handleDeletePrompt = (prompt: Prompt) => {
    const updatedPrompts = prompts.filter((p) => p.id !== prompt.id);

    homeDispatch({ field: 'prompts', value: updatedPrompts });
    savePrompts(updatedPrompts);
  };

  const handleUpdatePrompt = (prompt: Prompt) => {
    const updatedPrompts = prompts.map((p) => {
      if (p.id === prompt.id) {
        return prompt;
      }

      return p;
    });
    homeDispatch({ field: 'prompts', value: updatedPrompts });

    savePrompts(updatedPrompts);
  };

  const handleDrop = (e: any) => {
    if (e.dataTransfer) {
      const prompt = JSON.parse(e.dataTransfer.getData('prompt'));

      const updatedPrompt = {
        ...prompt,
        folderId: e.target.dataset.folderId,
      };

      handleUpdatePrompt(updatedPrompt);

      e.target.style.background = 'none';
    }
  };

  useEffect(() => {
    if (searchTerm) {
      promptDispatch({
        field: 'filteredPrompts',
        value: prompts.filter((prompt) => {
          const searchable =
            prompt.name.toLowerCase() +
            ' ' +
            prompt.description.toLowerCase() +
            ' ' +
            prompt.content.toLowerCase();
          return searchable.includes(searchTerm.toLowerCase());
        }),
      });
    } else {
      promptDispatch({ field: 'filteredPrompts', value: prompts });
    }
  }, [searchTerm, prompts]);
  
  let addprompt = true;
  for (var item of prompts) {
    if (item.name == '图文并茂'){
      addprompt = false;
    }
  }
  if(addprompt){
    prompts.push({
      "id": "1e027be9-16db-1340-18f0-1769864867a5",
      "name": "图文并茂",
      "description": "生成图文并茂的内容",
      "content": `你现在扮演一名文案写作家。根据提出的要求采用文字加插图的形式生成一篇完整的文案。请采用markdown的格式生成。

      插图的生成采用标准markdown格式: ![插图描述](api/showGenPicture?txt=Caption%20for%20the%20picture), 其中Caption%20for%20the%20picture是这个插图的内容文字说明，注意该图片的文字说明采用英文描述方式生成，并且其中不要有空格，如果有空格采用20%代替。
      
      例如：
      
      你需要一个苹果的插图，可以用：
      
      ![这是一个苹果](api/showGenPicture?txt=apple)
      
      你需要一个长城的插图，可以用：
      
      ![这是长城](api/showGenPicture?txt=the20%Great20%Wall)
      
      你需要一个烹饪的混合并炒制的插图，可以用：
      
      ![将材料混合并烧炒](api/showGenPicture?txt=Mix20%and20%stir-fry)
      
      文案要求：
      `,
      "model": {
          "id": "gpt-4",
          "name": "GPT-4",
          "maxLength": 12000,
          "tokenLimit": 4000
      },
      "folderId": null
    });
    prompts.push({
      "id": "2e027be9-26db-2340-28f0-2769864867a5",
      "name": "译成中文",
      "description": "翻译成中文",
      "content": '请将下面的内容翻译成中文：',
      "model": {
          "id": "gpt-3.5",
          "name": "GPT-3.5",
          "maxLength": 12000,
          "tokenLimit": 4000
      },
      "folderId": null
    });
    prompts.push({
      "id": "3e027be9-36db-3340-38f0-3769864867a5",
      "name": "To English",
      "description": "Translate into English",
      "content": 'Please translate the following text into English:',
      "model": {
          "id": "gpt-3.5",
          "name": "GPT-3.5",
          "maxLength": 12000,
          "tokenLimit": 4000
      },
      "folderId": null
    });
    prompts.push({
      "id": "4e027be9-46db-4340-48f0-4769864867a5",
      "name": "解释",
      "description": "解释内容",
      "content": '请解释一下后面的内容：',
      "model": {
          "id": "gpt-3.5",
          "name": "GPT-3.5",
          "maxLength": 12000,
          "tokenLimit": 4000
      },
      "folderId": null
    });
    prompts.push({
      "id": "5e027be9-56db-5340-58f0-5769864867a5",
      "name": "新闻头条",
      "description": "baidu新闻头条",
      "content": `首先介绍一下今天的日期，然后用简洁的语言总结下面的实时新闻信息。每一句话后面加上新闻的链接，采用markdown的方式显示。今天的日期是 ${new Date().toLocaleDateString()}。
      新闻信息如下：
      PT_FETCH(https://api.1314.cool/getbaiduhot/)`,
      "model": {
          "id": "gpt-3.5",
          "name": "GPT-3.5",
          "maxLength": 12000,
          "tokenLimit": 4000
      },
      "folderId": null
    });
    prompts.push({
      "id": "6e027be9-66db-6340-68f0-6769864867a5",
      "name": "实时财经",
      "description": "实时财经新闻，来自华尔街见闻",
      "content": `首先介绍一下今天的日期，然后使用这些来源信息提供准确的回答。以 markdown 格式回复。在每个句子的末尾添加链接（例如：[链接](https://.......)）使用引用的链接作为 markdown 链接引用。提供准确的回答后停止。今天的日期是 ${new Date().toLocaleDateString()}。

      示例来源: 途虎上市首日遭到京东“阻击”：如何在价格战中突围盈利 (链接：https://wallstreetcn.com/articles/3698838)
      
      示例回复: 途虎于首日上市面临了京东的竞争，这让它在价格战中寻求盈利的突破（[链接](https://wallstreetcn.com/articles/3698838)）。
      
      来源:
      PT_WS_FETCH()
      
      输入: 按照上面的格式要求总结一下来源中的新闻信息`,
      "model": {
          "id": "gpt-3.5",
          "name": "GPT-3.5",
          "maxLength": 12000,
          "tokenLimit": 4000
      },
      "folderId": null
    });
  }

  return (
    <PromptbarContext.Provider
      value={{
        ...promptBarContextValue,
        handleCreatePrompt,
        handleDeletePrompt,
        handleUpdatePrompt,
      }}
    >
      <Sidebar<Prompt>
        side={'right'}
        isOpen={showPromptbar}
        addItemButtonTitle={t('New prompt')}
        itemComponent={
          <Prompts
            prompts={filteredPrompts.filter((prompt) => !prompt.folderId)}
          />
        }
        folderComponent={<PromptFolders />}
        items={filteredPrompts}
        searchTerm={searchTerm}
        handleSearchTerm={(searchTerm: string) =>
          promptDispatch({ field: 'searchTerm', value: searchTerm })
        }
        toggleOpen={handleTogglePromptbar}
        handleCreateItem={handleCreatePrompt}
        handleCreateFolder={() => handleCreateFolder(t('New folder'), 'prompt')}
        handleDrop={handleDrop}
      />
    </PromptbarContext.Provider>
  );
};

export default Promptbar;
