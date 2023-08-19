import { IconCheck, IconClipboard, IconDownload, IconRun } from '@tabler/icons-react';
import { FC, memo, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { ExecuteCode } from './ExecuteCode';
import { useTranslation } from 'next-i18next';

import {
  generateRandomString,
  programmingLanguages,
} from '@/utils/app/codeblock';

interface Props {
  language: string;
  value: string;
  star: any;
  end: any;
  onUpdate: (c:any, star : any,end : any) => void;
  }

export const CodeBlock: FC<Props> = memo(({ language, value, star, end, onUpdate }) => {
  const { t } = useTranslation('markdown');
  const [isCopied, setIsCopied] = useState<Boolean>(false);
  const [thevalue, setvalue] = useState(value);
  const [showModal, setShowModal] = useState<boolean>(false);

  const executeCode = () => {
    setShowModal(true);
  };

  const updateCode = (c : string) => {
    onUpdate(c,star,end);
  };

  const copyToClipboard = () => {
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      return;
    }

    navigator.clipboard.writeText(thevalue).then(() => {
      setIsCopied(true);

      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    });
  };
  const downloadAsFile = () => {
    const fileExtension = programmingLanguages[language] || '.file';
    const suggestedFileName = `file-${generateRandomString(
      3,
      true,
    )}${fileExtension}`;
    const fileName = window.prompt(
      t('Enter file name') || '',
      suggestedFileName,
    );

    if (!fileName) {
      // user pressed cancel on prompt
      return;
    }

    const blob = new Blob([thevalue], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = fileName;
    link.href = url;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

    return (
    <div className="codeblock relative font-sans text-[16px]">
      <div className="flex items-center justify-between py-1.5 px-4">
        <span className="text-xs lowercase text-white">{language}</span>

        <div className="flex items-center">
          <button
            className="flex items-center rounded bg-none p-1 text-xs text-white"
            onClick={executeCode}
          >
            {<IconRun size={18} />}
            {t('Execute')}
          </button>
          {showModal && (<ExecuteCode
          language={language}
          code={thevalue}
          onClose={() => setShowModal(false)}
          onUpdate={updateCode}
          />)}
          <button
            className="flex gap-1.5 items-center rounded bg-none p-1 text-xs text-white"
            onClick={copyToClipboard}
          >
            {isCopied ? <IconCheck size={18} /> : <IconClipboard size={18} />}
            {isCopied ? t('Copied!') : t('Copy code')}
          </button>
          <button
            className="flex items-center rounded bg-none p-1 text-xs text-white"
            onClick={downloadAsFile}
          >
            <IconDownload size={18} />
          </button>
        </div>
      </div>

      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{ margin: 0 }}
      >
        {thevalue}
              </SyntaxHighlighter>
          </div>
  );
});
CodeBlock.displayName = 'CodeBlock';
