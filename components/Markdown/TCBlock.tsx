import { IconRun } from '@tabler/icons-react';
import { FC, memo, useState } from 'react';
import { ExecuteTC } from './ExecuteTC';
import { relative } from 'path';

interface Propss {
  value: string;
  msg: string;
  }

export const TCBlock: FC<Propss> = memo(({ value, msg }) => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [tvalue, setValue] = useState<string>(value);
  
  const regex = /## INNER_HAWKEYE_TESTCASE_ACTION_START([\s\S]*)## INNER_HAWKEYE_TESTCASE_ACTION_END/g;
  let t_msg = '';
  // 提取匹配结果
  const match = regex.exec(msg);
  if (match != null) {
      console.log('Matched text: ', match[1]);
      t_msg = match[1];
  } 
  const [tmsg, setMsg] = useState<string>(t_msg);
  const executeCode = () => {
    setShowModal(true);
  };
  console.log(value);
  return (
    <div className="break-words border items-center border-black bg-gray-700 px-3 py-1 text-white dark:border-white" style={{ position: 'relative' }}>
      <h2 className="text-2xl items-center font-bold" style={{ margin: '15px', textAlign: 'center' }}>
       {tvalue.includes("HAWKEYE") ? 'Hawkeye Testcase' : 'E MAIL'}{(tvalue === 'INNER_HAWKEYE_TESTCASE_ACTION_START' || tvalue === 'INNER_MAIL_ACTION_START') ? '' : ' End'}
      </h2>
      {(tvalue.includes('INNER_HAWKEYE_TESTCASE_ACTION_START') || tvalue.includes('INNER_MAIL_ACTION_START')) ? (
        <div className='dark:border-white dark:bg-[#444654]' style={{
        width: '100%',
        height: '50px',
        position: 'absolute',
        left: 0,
        bottom: '-28px',
        borderTopLeftRadius: '100%',
        borderTopRightRadius: '100%',
        borderTop: '6px solid #fff',
        }}
        ></div>
      ) : (
        
        <div>
          <div className='dark:border-white dark:bg-[#444654]' style={{
          width: '100%',
          height: '50px',
          position: 'absolute',
          left: 0,
          top: '-28px',
          borderBottomLeftRadius: '100%',
          borderBottomRightRadius: '100%',
          borderBottom: '6px solid #fff',
          }}
          ></div>
          <button
            className="flex items-center rounded bg-none p-1 text-xs text-white"
            style={{ float: 'right', position: 'absolute', right: '10px', top: '40px' }}
            onClick={() => setShowModal(true)}
          >
            <IconRun size={18} />
            {'Execute'}
          </button>
          {showModal && (
            <ExecuteTC
              IP=""
              code={tmsg}
              onClose={() => setShowModal(false)}
              onUpdate={(code) => setShowModal(false)}
            />
          )}
        </div>
      )}
    </div>
  );
  
});
TCBlock.displayName = 'TCBlock';
