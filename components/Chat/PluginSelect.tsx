import { FC, useEffect, useRef, useState } from 'react';

import { useTranslation } from 'next-i18next';

import { Plugin, PluginList, PluginID } from '@/types/plugin';

interface Props {
  plugin: Plugin | null;
  onPluginChange: (plugin: Plugin) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLSelectElement>) => void;
}

export const PluginSelect: FC<Props> = ({
  plugin,
  onPluginChange,
  onKeyDown,
}) => {
  const { t } = useTranslation('chat');
  const [selectedFile, setSelectedFile] = useState(null);
  const selectRef = useRef<HTMLSelectElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLSelectElement>) => {
    const selectElement = selectRef.current;
    const optionCount = selectElement?.options.length || 0;

    if (e.key === '/' && e.metaKey) {
      e.preventDefault();
      if (selectElement) {
        selectElement.selectedIndex =
          (selectElement.selectedIndex + 1) % optionCount;
        selectElement.dispatchEvent(new Event('change'));
      }
    } else if (e.key === '/' && e.shiftKey && e.metaKey) {
      e.preventDefault();
      if (selectElement) {
        selectElement.selectedIndex =
          (selectElement.selectedIndex - 1 + optionCount) % optionCount;
        selectElement.dispatchEvent(new Event('change'));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectElement) {
        selectElement.dispatchEvent(new Event('change'));
      }

      onPluginChange(
        PluginList.find(
          (plugin) =>
            plugin.name === selectElement?.selectedOptions[0].innerText,
        ) as Plugin,
      );
    } else {
      onKeyDown(e);
    }
  };

  useEffect(() => {
    if (selectRef.current) {
      selectRef.current.focus();
    }
  }, []);

  return (
    <div className="flex flex-col">
      <div className="mb-1 w-full rounded border border-neutral-200 bg-transparent pr-2 text-neutral-900 dark:border-neutral-600 dark:text-white">
        <select
          ref={selectRef}
          className="w-full cursor-pointer bg-transparent p-2"
          placeholder={t('Select a plugin') || ''}
          value={plugin?.id || ''}
          onChange={(e) => {
            console.log(PluginList);
            if(e.target.value === PluginID.FILE){
              // 选择了插件 "FILE"
              const fileInput = document.createElement('input');
              fileInput.type = 'file';
              fileInput.accept = '.pdf,.tsx,.ts,.py,.js,.txt,.md,.png,.jpg'; // 限制文件类型
              const handleFileUpload = (event) => {
                const file = event.target.files[0]; // 获取选中的文件
                // 判断文件后缀名
                //const allowedExtensions = /(\.pdf|\.txt|\.md)$/i;
                const allowedExtensions = /(\.pdf|\.tsx|\.ts|\.py|\.js|\.txt|\.md|\.jpg|\.png)$/i;
                if (allowedExtensions.test(file.name)) {
                
                    let formData = new FormData();
                    formData.append('file', file);
                    let the_host = '172.16.6.11';
                    if (window.location.hostname.includes('perfectek')){
                      the_host = window.location.hostname;
                    }
                    fetch(`http://${the_host}:8000/upload_file`, {
                        method: 'POST',
                        body: formData
                    })
                    .then(response => {
                      if (response.ok) {
                        return response.json();
                      } else {
                        throw new Error('请求服务失败'); // 抛出自定义的错误
                      }
                    })
                    .then(data => {
                        console.log(PluginList);
                        setSelectedFile(file); // 设置选中的文件
                        let f_plugin = PluginList.find(
                          (plugin) => plugin.id === e.target.value,
                        ) as Plugin;
                        console.log(e.target.value);
                        console.log(f_plugin);
                        f_plugin.requiredKeys[0].value = data.filename;
                        onPluginChange(
                          f_plugin
                        );
                        alert('The file is upload successfully, can talk with it!');
                    })
                    .catch((error) => {
                        alert('文件上传错误');
                        console.error('Error:', error);
                    });
                  
                } else {
                  // 文件后缀名不符合要求，进行相应提示或处理逻辑
                  alert('ERROR:The file is not supported');
                  console.log('The file is not supported');
                }
            
              };
              fileInput.addEventListener('change', handleFileUpload);
              fileInput.click(); // 触发文件选择框的点击事件
            }
            onPluginChange(
              PluginList.find(
                (plugin) => plugin.id === e.target.value,
              ) as Plugin,
            );
            
          }}
          onKeyDown={(e) => {
            handleKeyDown(e);
          }}
        >
          <option
            key="chatgpt"
            value="chatgpt"
            className="dark:bg-[#343541] dark:text-white"
          >
            AIChat
          </option>

          {PluginList.map((plugin) => (
            <option
              key={plugin.id}
              value={plugin.id}
              className="dark:bg-[#343541] dark:text-white"
            >
              {plugin.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
