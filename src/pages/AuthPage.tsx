import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, register, generateCoupleId, getCoupleProfile, error: storeError } = useAuthStore();
  const [isLogin, setIsLogin] = useState(true);
  const [isCreateCouple, setIsCreateCouple] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [boyNickname, setBoyNickname] = useState('');
  const [girlNickname, setGirlNickname] = useState('');
  const [togetherDate, setTogetherDate] = useState('');
  const [coupleId, setCoupleId] = useState('');
  const [gender, setGender] = useState<'boy' | 'girl'>('boy');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('请填写用户名和密码');
      return;
    }
    const success = await login(username, password);
    if (success) {
      navigate('/');
    } else {
      setError(storeError || '用户名或密码错误');
    }
  };

  const handleRegister = async () => {
    if (!username.trim() || !password.trim()) {
      setError('请填写用户名和密码');
      return;
    }

    if (isCreateCouple) {
      if (!boyNickname.trim() || !girlNickname.trim() || !togetherDate) {
        setError('请填写昵称和相恋日期');
        return;
      }
      const newCoupleId = generateCoupleId();
      const success = await register(username, password, gender, {
        coupleId: newCoupleId,
        boyNickname,
        girlNickname,
        togetherDate,
      });
      if (success) {
        alert(`情侣码已生成：${newCoupleId}\n请分享给你的另一半！`);
        navigate('/');
      } else {
        setError('用户名已存在');
      }
    } else {
      if (!coupleId.trim()) {
        setError('请填写情侣码');
        return;
      }
      const profile = getCoupleProfile(coupleId);
      if (!profile) {
        setError('情侣码不存在');
        return;
      }
      const success = await register(username, password, gender, {
        coupleId,
        boyNickname: profile.boyNickname,
        girlNickname: profile.girlNickname,
        togetherDate: profile.togetherDate,
      });
      if (success) {
        navigate('/');
      } else {
        setError('用户名已存在');
      }
    }
  };

  const handleCopyCoupleId = () => {
    const newId = generateCoupleId();
    navigator.clipboard.writeText(newId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-3xl shadow-lg">
            ♥
          </div>
          <h1 className="text-2xl font-semibold text-text-primary mb-2">恋爱小窝</h1>
          <p className="text-text-muted text-sm">Love Diary</p>
        </div>

        <div className="bg-white rounded-2xl shadow-card p-6 mb-6">
          <div className="flex items-center justify-center gap-2 mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                isLogin ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:bg-gray-50'
              }`}
            >
              登录
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                !isLogin ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:bg-gray-50'
              }`}
            >
              注册
            </button>
          </div>

          {error && (
            <div className="bg-danger/10 text-danger text-sm p-3 rounded-xl mb-4 text-center">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-text-secondary text-sm mb-2">用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
              />
            </div>

            <div>
              <label className="block text-text-secondary text-sm mb-2">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
              />
            </div>

            {!isLogin && (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={() => setIsCreateCouple(true)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                      isCreateCouple ? 'bg-primary/10 text-primary' : 'text-text-muted hover:bg-gray-50'
                    }`}
                  >
                    创建情侣空间
                  </button>
                  <button
                    onClick={() => setIsCreateCouple(false)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                      !isCreateCouple ? 'bg-primary/10 text-primary' : 'text-text-muted hover:bg-gray-50'
                    }`}
                  >
                    加入已有空间
                  </button>
                </div>

                <div>
                  <label className="block text-text-secondary text-sm mb-2">你的性别</label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setGender('boy')}
                      className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        gender === 'boy' ? 'bg-primary/10 text-primary border-2 border-primary' : 'bg-gray-50 text-text-muted border-2 border-transparent hover:bg-gray-100'
                      }`}
                    >
                      👦 男生
                    </button>
                    <button
                      onClick={() => setGender('girl')}
                      className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        gender === 'girl' ? 'bg-accent/10 text-accent border-2 border-accent' : 'bg-gray-50 text-text-muted border-2 border-transparent hover:bg-gray-100'
                      }`}
                    >
                      👧 女生
                    </button>
                  </div>
                </div>

                {isCreateCouple ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-text-secondary text-sm mb-2">男生昵称</label>
                        <input
                          type="text"
                          value={boyNickname}
                          onChange={(e) => setBoyNickname(e.target.value)}
                          placeholder="他的昵称"
                          className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-text-secondary text-sm mb-2">女生昵称</label>
                        <input
                          type="text"
                          value={girlNickname}
                          onChange={(e) => setGirlNickname(e.target.value)}
                          placeholder="她的昵称"
                          className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-text-secondary text-sm mb-2">相恋日期</label>
                      <input
                        type="date"
                        value={togetherDate}
                        onChange={(e) => setTogetherDate(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all date-picker-input"
                      />
                    </div>
                    <button
                      onClick={handleCopyCoupleId}
                      className="w-full py-2 bg-accent/10 text-accent rounded-xl text-sm font-medium hover:bg-accent/20 transition-colors flex items-center justify-center gap-2"
                    >
                      {copied ? '✓ 已复制' : '📋 生成并复制情侣码'}
                    </button>
                  </>
                ) : (
                  <div>
                    <label className="block text-text-secondary text-sm mb-2">情侣码</label>
                    <input
                      type="text"
                      value={coupleId}
                      onChange={(e) => setCoupleId(e.target.value)}
                      placeholder="输入另一半分享的情侣码"
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    />
                    <p className="text-text-muted text-xs mt-2">情侣码由创建空间的一方提供</p>
                  </div>
                )}
              </>
            )}
          </div>

          <button
            onClick={isLogin ? handleLogin : handleRegister}
            className="w-full mt-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-all shadow-sm hover:shadow-md"
          >
            {isLogin ? '登录' : '注册'}
          </button>
        </div>

        <p className="text-center text-text-muted text-xs">
          用爱记录每一天 · 2026 Love Diary
        </p>
      </div>
    </div>
  );
};