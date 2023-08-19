import { FC, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

interface CodeExe {
  language: String;
  code: String;
  onClose: () => void;
  onUpdate: (c:any) => void;
}

export const ExecuteCode: FC<CodeExe> = ({ language, code, onClose, onUpdate }) => {
  let result ='';
  let running = false;
  let oldcode = code;
  const oldlanguag = language;
  const modalRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [thecode, setCode] = useState(code);
  const [content, setContent] = useState(result);
  const [coderun, setcoderun] = useState(running);
  const [t_language, setLanguage] = useState(language); 
  const [t_oldcode, setoldcode] = useState(oldcode); 
  const [t_oldlanguage, setoldlanguag] = useState(oldlanguag); 
  
  let controller:any; // 在外部作用域定义，以便两个函数都可以访问
  const [controller_a, setcontroller] = useState(controller);
  
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        window.addEventListener('mouseup', handleMouseUp);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      window.removeEventListener('mouseup', handleMouseUp);
      if(thecode !== t_oldcode || t_oldlanguage !== t_language){
        const isConfirmed = window.confirm("是否更新修改后代码?");
        if (isConfirmed) {
          onUpdate("```" + t_language + "\n" + thecode + "\n```\n");
        }
      }
      onClose();
    };

    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [onClose, thecode, t_oldcode, t_language]);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  const handleLanguageChange = (event:any) => {
    setLanguage(event.target.value);
  };

  const stopExe = () => {
    if (controller_a) {
      controller_a.abort(); // 中断请求
    }
  };
  const executeCode = async () => {
    if (!['html', 'python', 'javascript', 'shell', 'bash'].includes(t_language)) {
      setContent(`${t_language} can not be executed.`);
      return;
    }
    if(t_language == 'html'){
      // 创建一个新的浏览器窗口并加载HTML页面
      var newWindow = window.open();
      newWindow.document.open();
      newWindow.document.write(thecode);
      newWindow.document.close();
      
    }
    else{
      try{
        const url = "api/executeCode";
        let obj = new AbortController();
        const { signal } = obj; // 从控制器获取信号
        setcoderun(true); // 设置运行状态
        setcontroller(obj);
        
        const response = await fetch(url, {
          method: 'POST',
          body: JSON.stringify({language:t_language, content: thecode}),
          headers: {'Content-Type': 'application/json'},
          signal: signal // 将信号传递给fetch
        });

        // 检查请求是否被中断
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let content = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          content += decoder.decode(value);
          setContent(content);
        }

        setContent(content);
        
      }catch (error) {
        const e = error as Error; // 使用类型断言
        if (e.name === 'AbortError') {
          console.log('Fetch aborted');
        } else {
          console.error('There was a problem with the fetch operation:', e.message);
        }
        setContent(`HTTP error! Status: ${e.message}`);
      } finally {
        setcoderun(false);
      }
    }
  };
  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
    >
      <div className="fixed inset-0 z-10 overflow-hidden">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <div
            className="hidden sm:inline-block sm:h-screen sm:align-middle"
            aria-hidden="true"
          />

          <div
            ref={modalRef}
            className="dark:border-netural-400 inline-block max-h-[400px] transform overflow-y-auto rounded-lg border border-gray-300 bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all dark:bg-[#202123] sm:my-8 sm:max-h-[600px] sm:w-full sm:max-w-lg sm:p-6 sm:align-middle"
            style={{ 'maxWidth': '70rem','maxHeight': '70rem' }}
            role="dialog"
          >
            <div className="text-sm font-bold text-black dark:text-neutral-200">
              {'Language'}
            </div>
            <div className="w-full rounded-lg border border-neutral-200 bg-transparent pr-2 text-neutral-900 dark:border-neutral-600 dark:text-white">
              <select className="w-full bg-transparent p-2" placeholder={'Select a language'} value={t_language} onChange={handleLanguageChange}>
                  <option className="dark:bg-[#343541] dark:text-white">python</option>
                  <option className="dark:bg-[#343541] dark:text-white">javascript</option>
                  <option className="dark:bg-[#343541] dark:text-white">bash</option>
                  <option className="dark:bg-[#343541] dark:text-white">shell</option>
                  <option className="dark:bg-[#343541] dark:text-white">html</option>
                  <option className="dark:bg-[#343541] dark:text-white">json</option>
                  <option className="dark:bg-[#343541] dark:text-white"></option>
              </select>
            </div>
            <div style={{ position: 'relative' }}>
              {/* Textarea for user input */}
              <textarea
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  opacity: 0.5, // You can adjust the opacity or style as needed
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'transparent', // To hide the actual text
                  zIndex: 2,
                  whiteSpace: 'pre' // To respect indentation and spaces
                }}
                value={thecode}
                onChange={e => setCode(e.target.value)}
              />

              {/* SyntaxHighlighter to show the highlighted code */}
              <SyntaxHighlighter 
                language="javascript"
                style={oneDark}
                customStyle={{ margin: 0 }}
              >
                {thecode}
              </SyntaxHighlighter>
            </div>
            
            <div className="mt-6 text-sm font-bold text-black dark:text-neutral-200 flex items-center">              
              {'Result'}
              {coderun ? (
              <div className="h-4 w-4 animate-spin rounded-full border-t-2 border-neutral-800 opacity-60 dark:border-neutral-100"></div>
              ) : (''
              )}
            </div>
            <textarea
              className="mt-2 w-full rounded-lg border border-neutral-500 px-4 py-2 text-neutral-900 shadow focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-[#40414F] dark:text-neutral-100"
              style={{ resize: 'none', display: 'block'}}
              defaultValue={content}              
              rows={5}
            />

            <button
              type="button"
              className="w-full px-4 py-2 mt-6 border rounded-lg shadow border-neutral-500 text-neutral-900 hover:bg-neutral-100 focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-300"
              onClick={() => {
                setContent('');
                coderun ? stopExe() : executeCode();
              }}
            >
              {coderun ? ('Stop') : ('Run')}
              
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
