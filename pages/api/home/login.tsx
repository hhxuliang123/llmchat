import React, { useState, KeyboardEvent, useEffect } from 'react';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorinfo, seterrorinfo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(()=>{
    setUsername(localStorage.getItem('username') || "");
    //setPassword(localStorage.getItem('password') || "");
  },[])


  const to_login = async (username: string, password: string): Promise<void> => {
    try {
      // 这里的URL应该是你的登录API的地址
      const response = await fetch('api/executeLogin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: username,
          password: password
        })
      });
      console.log(response)
      if (response.ok) {
        // 如果登录成功，则调用 setIsLoggedIn 设定登录状态
        localStorage.setItem('username', username);
        //localStorage.setItem('password', password);

        onLogin();
      } else {
        seterrorinfo('Login failed');
        setLoading(false);        
      }
      
    } catch (error) {
      console.error('An error occurred:', error);
      setLoading(false);
      // 这里可以添加处理登录接口调用失败的逻辑
    }
  };

  const handleEnter = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleLogin(e);
    }
  };

  const handleLogin = (event) => {
    setLoading(true);
    seterrorinfo('');
    event.preventDefault();
    to_login(username,password);
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
      onKeyDown={handleEnter}
    >
      <div className="fixed inset-0 z-10 overflow-hidden">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <div
            className="hidden sm:inline-block sm:h-screen sm:align-middle"
            aria-hidden="true"
          />

          <div
            className="dark:border-netural-400 inline-block max-h-[400px] transform overflow-y-auto rounded-lg border border-gray-300 bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all dark:bg-[#202123] sm:my-8 sm:max-h-[600px] sm:w-full sm:max-w-lg sm:p-6 sm:align-middle"
            style={{ 'maxWidth': '20rem','maxHeight': '70rem' }}
            role="dialog"
          >
            <div className="text-sm font-bold text-black dark:text-neutral-200">
              {'Username'}
            </div>
            <div className="w-full rounded-lg border border-neutral-200 bg-transparent pr-2 text-neutral-900 dark:border-neutral-600 dark:text-white">
              <input className="w-full bg-transparent p-2" placeholder={'Username'} value={username}
              onChange={e => setUsername(e.target.value)}
                >
                  
              </input>
            </div>
            <div className="text-sm font-bold text-black dark:text-neutral-200">
              {'Password'}
            </div>
            <div className="w-full rounded-lg border border-neutral-200 bg-transparent pr-2 text-neutral-900 dark:border-neutral-600 dark:text-white">
              <input className="w-full bg-transparent p-2" placeholder={'Password'} value={password} type="password"
              onChange={e => setPassword(e.target.value)}
              >
                  
              </input>
            </div>
            

            <button
              type="button"
              className="w-full px-4 py-2 mt-6 border rounded-lg shadow border-neutral-500 text-neutral-900 hover:bg-neutral-100 focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-300"
              onClick={handleLogin}
              disabled={loading}

            >
              {loading ? 'Loading...' : 'Login'}
              
            </button>
            <div className="px-3 pt-2 pb-3 text-center text-[12px] text-black/50 dark:text-white/50 md:px-4 md:pt-3 md:pb-6">
              {errorinfo}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
