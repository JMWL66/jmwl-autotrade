import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useSWR from 'swr'
import { api } from './lib/api'
import { TraderDashboardPage } from './pages/TraderDashboardPage'

import { AITradersPage } from './components/trader/AITradersPage'
import { LoginPage } from './components/auth/LoginPage'
import { SetupPage } from './components/modals/SetupPage'
import { SettingsPage } from './pages/SettingsPage'
import { ResetPasswordPage } from './components/auth/ResetPasswordPage'
import { CompetitionPage } from './components/trader/CompetitionPage'
import { LandingPage } from './pages/LandingPage'
import { FAQPage } from './pages/FAQPage'
import { StrategyStudioPage } from './pages/StrategyStudioPage'
import { StrategyMarketPage } from './pages/StrategyMarketPage'
import { DataPage } from './pages/DataPage'
import { BeginnerOnboardingPage } from './pages/BeginnerOnboardingPage'
import { LoginRequiredOverlay } from './components/auth/LoginRequiredOverlay'
import HeaderBar from './components/common/HeaderBar'
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ConfirmDialogProvider } from './components/common/ConfirmDialog'
import { t } from './i18n/translations'
import { useSystemConfig } from './hooks/useSystemConfig'
import { getUserMode, hasCompletedBeginnerOnboarding } from './lib/onboarding'

import { OFFICIAL_LINKS } from './constants/branding'
import type {
  SystemStatus,
  AccountInfo,
  Position,
  DecisionRecord,
  Statistics,
  TraderInfo,
  Exchange,
} from './types'

type Page =
  | 'competition'
  | 'traders'
  | 'trader'
  | 'strategy'
  | 'strategy-market'
  | 'data'
  | 'faq'
  | 'login'
  | 'register'



function App() {
  const { language, setLanguage } = useLanguage()
  const { user, token, logout, isLoading } = useAuth()
  const { config: systemConfig, loading: configLoading } = useSystemConfig()
  const [route, setRoute] = useState(window.location.pathname)

  // 从URL路径读取初始页面状态（支持刷新保持页面）
  const getInitialPage = (): Page => {
    const path = window.location.pathname
    const hash = window.location.hash.slice(1) // 去掉 #

    if (path === '/welcome') return 'traders'
    if (path === '/traders' || hash === 'traders') return 'traders'
    if (path === '/strategy' || hash === 'strategy') return 'strategy'
    if (path === '/strategy-market' || hash === 'strategy-market') return 'strategy-market'
    if (path === '/data' || hash === 'data') return 'data'
    if (path === '/dashboard' || hash === 'trader' || hash === 'details')
      return 'trader'
    return 'competition' // 默认为竞赛页面
  }

  // Login required overlay state
  const [loginOverlayOpen, setLoginOverlayOpen] = useState(false)
  const [loginOverlayFeature, setLoginOverlayFeature] = useState('')

  const handleLoginRequired = (featureName: string) => {
    setLoginOverlayFeature(featureName)
    setLoginOverlayOpen(true)
  }

  // Unified page navigation handler
  const navigateToPage = (page: Page) => {
    const pathMap: Record<Page, string> = {
      'competition': '/competition',
      'strategy-market': '/strategy-market',
      'data': '/data',
      'traders': '/traders',
      'trader': '/dashboard',
      'strategy': '/strategy',
      'faq': '/faq',
      'login': '/login',
      'register': '/register',
    }
    const path = pathMap[page]
    if (path) {
      window.history.pushState({}, '', path)
      setRoute(path)
      setCurrentPage(page)
    }
  }

  const [currentPage, setCurrentPage] = useState<Page>(getInitialPage())
  // 从 URL 参数读取初始 trader 标识（格式: name-id前4位）
  const [selectedTraderSlug, setSelectedTraderSlug] = useState<string | undefined>(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('trader') || undefined
  })
  const [selectedTraderId, setSelectedTraderId] = useState<string | undefined>()

  // 生成 trader URL slug（name + ID 前 4 位）
  const getTraderSlug = (trader: TraderInfo) => {
    const idPrefix = trader.trader_id.slice(0, 4)
    return `${trader.trader_name}-${idPrefix}`
  }

  // 从 slug 解析并匹配 trader
  const findTraderBySlug = (slug: string, traderList: TraderInfo[]) => {
    // slug 格式: name-xxxx (xxxx 是 ID 前 4 位)
    const lastDashIndex = slug.lastIndexOf('-')
    if (lastDashIndex === -1) {
      // 没有 dash，直接按 name 匹配
      return traderList.find(t => t.trader_name === slug)
    }
    const name = slug.slice(0, lastDashIndex)
    const idPrefix = slug.slice(lastDashIndex + 1)
    return traderList.find(t =>
      t.trader_name === name && t.trader_id.startsWith(idPrefix)
    )
  }
  const [lastUpdate, setLastUpdate] = useState<string>('--:--:--')
  const [decisionsLimit, setDecisionsLimit] = useState<number>(5)
  const hasPersistedAuth =
    !!localStorage.getItem('auth_token') && !!localStorage.getItem('auth_user')

  // Poll-off states: stop polling after 3 consecutive failures
  const [accountPollOff, setAccountPollOff] = useState(false)
  const [positionsPollOff, setPositionsPollOff] = useState(false)
  const [decisionsPollOff, setDecisionsPollOff] = useState(false)

  // Reset poll-off states when trader changes
  useEffect(() => {
    setAccountPollOff(false)
    setPositionsPollOff(false)
    setDecisionsPollOff(false)
  }, [selectedTraderId])

  // 监听URL变化，同步页面状态
  useEffect(() => {
    const handleRouteChange = () => {
      const path = window.location.pathname
      const hash = window.location.hash.slice(1)
      const params = new URLSearchParams(window.location.search)
      const traderParam = params.get('trader')

      if (path === '/welcome') {
        setCurrentPage('traders')
      } else if (path === '/traders' || hash === 'traders') {
        setCurrentPage('traders')
      } else if (path === '/strategy' || hash === 'strategy') {
        setCurrentPage('strategy')
      } else if (path === '/strategy-market' || hash === 'strategy-market') {
        setCurrentPage('strategy-market')
      } else if (path === '/data' || hash === 'data') {
        setCurrentPage('data')
      } else if (
        path === '/dashboard' ||
        hash === 'trader' ||
        hash === 'details'
      ) {
        setCurrentPage('trader')
        // 如果 URL 中有 trader 参数（slug 格式），更新选中的 trader
        setSelectedTraderSlug(traderParam || undefined)
      } else if (
        path === '/competition' ||
        hash === 'competition' ||
        hash === ''
      ) {
        setCurrentPage('competition')
      }
      setRoute(path)
    }

    window.addEventListener('hashchange', handleRouteChange)
    window.addEventListener('popstate', handleRouteChange)
    return () => {
      window.removeEventListener('hashchange', handleRouteChange)
      window.removeEventListener('popstate', handleRouteChange)
    }
  }, [])

  // 切换页面时更新URL hash (当前通过按钮直接调用setCurrentPage，这个函数暂时保留用于未来扩展)
  // const navigateToPage = (page: Page) => {
  //   setCurrentPage(page);
  //   window.location.hash = page === 'competition' ? '' : 'trader';
  // };

  // 获取trader列表（仅在用户登录时）
  const { data: traders, error: tradersError } = useSWR<TraderInfo[]>(
    user && token ? 'traders' : null,
    () => api.getTraders(currentPage === 'trader'),
    {
      refreshInterval: 10000,
      shouldRetryOnError: false, // 避免在后端未运行时无限重试
    }
  )

  // 获取exchanges列表（用于显示交易所名称）
  const { data: exchanges } = useSWR<Exchange[]>(
    user && token ? 'exchanges' : null,
    api.getExchangeConfigs,
    {
      refreshInterval: 60000, // 1分钟刷新一次
      shouldRetryOnError: false,
    }
  )

  // 当获取到traders后，根据 URL 中的 trader slug 设置选中的 trader，或默认选中第一个
  useEffect(() => {
    if (!traders || traders.length === 0) {
      return
    }

    if (selectedTraderSlug) {
      // 通过 slug 找到对应的 trader
      const trader = findTraderBySlug(selectedTraderSlug, traders)
      const nextTraderId = trader?.trader_id || traders[0].trader_id
      if (nextTraderId !== selectedTraderId) {
        setSelectedTraderId(nextTraderId)
      }
      return
    }

    if (!selectedTraderId) {
      setSelectedTraderId(traders[0].trader_id)
    }
  }, [traders, selectedTraderId, selectedTraderSlug])

  // 如果在trader页面，获取该trader的数据
  const { data: status } = useSWR<SystemStatus>(
    currentPage === 'trader' && selectedTraderId
      ? `status-${selectedTraderId}`
      : null,
    () => api.getStatus(selectedTraderId, true),
    {
      refreshInterval: 15000, // 15秒刷新（配合后端15秒缓存）
      revalidateOnFocus: false, // 禁用聚焦时重新验证，减少请求
      dedupingInterval: 10000, // 10秒去重，防止短时间内重复请求
    }
  )

  const { data: account } = useSWR<AccountInfo>(
    currentPage === 'trader' && selectedTraderId
      ? `account-${selectedTraderId}`
      : null,
    () => api.getAccount(selectedTraderId, true),
    {
      refreshInterval: accountPollOff ? 0 : 15000,
      revalidateOnFocus: false,
      dedupingInterval: 10000,
      onErrorRetry: (_err, _key, _config, revalidate, { retryCount }) => {
        if (retryCount >= 2) { setAccountPollOff(true); return }
        setTimeout(() => revalidate({ retryCount }), 500)
      },
      onSuccess: () => { if (accountPollOff) setAccountPollOff(false) },
    }
  )

  const { data: positions } = useSWR<Position[]>(
    currentPage === 'trader' && selectedTraderId
      ? `positions-${selectedTraderId}`
      : null,
    () => api.getPositions(selectedTraderId, true),
    {
      refreshInterval: positionsPollOff ? 0 : 15000,
      revalidateOnFocus: false,
      dedupingInterval: 10000,
      onErrorRetry: (_err, _key, _config, revalidate, { retryCount }) => {
        if (retryCount >= 2) { setPositionsPollOff(true); return }
        setTimeout(() => revalidate({ retryCount }), 500)
      },
      onSuccess: () => { if (positionsPollOff) setPositionsPollOff(false) },
    }
  )

  const { data: decisions } = useSWR<DecisionRecord[]>(
    currentPage === 'trader' && selectedTraderId
      ? `decisions/latest-${selectedTraderId}-${decisionsLimit}`
      : null,
    () => api.getLatestDecisions(selectedTraderId, decisionsLimit, true),
    {
      refreshInterval: decisionsPollOff ? 0 : 30000,
      revalidateOnFocus: false,
      dedupingInterval: 20000,
      onErrorRetry: (_err, _key, _config, revalidate, { retryCount }) => {
        if (retryCount >= 2) { setDecisionsPollOff(true); return }
        setTimeout(() => revalidate({ retryCount }), 500)
      },
      onSuccess: () => { if (decisionsPollOff) setDecisionsPollOff(false) },
    }
  )

  const { data: stats } = useSWR<Statistics>(
    currentPage === 'trader' && selectedTraderId
      ? `statistics-${selectedTraderId}`
      : null,
    () => api.getStatistics(selectedTraderId, true),
    {
      refreshInterval: 30000, // 30秒刷新（统计数据更新频率较低）
      revalidateOnFocus: false,
      dedupingInterval: 20000,
    }
  )

  useEffect(() => {
    if (account) {
      const now = new Date().toLocaleTimeString()
      setLastUpdate(now)
    }
  }, [account])

  const selectedTrader = traders?.find((t) => t.trader_id === selectedTraderId)

  const effectiveAccount = account
  const effectivePositions = positions
  const effectiveDecisions = decisions

  // Handle routing
  useEffect(() => {
    const handlePopState = () => {
      setRoute(window.location.pathname)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Set current page based on route for consistent navigation state
  useEffect(() => {
    if (route === '/welcome') {
      setCurrentPage('traders')
    } else if (route === '/competition') {
      setCurrentPage('competition')
    } else if (route === '/traders') {
      setCurrentPage('traders')
    } else if (route === '/dashboard') {
      setCurrentPage('trader')
    }
  }, [route])

  const showBeginnerOnboarding =
    route === '/welcome' && (!!user || hasPersistedAuth) && getUserMode() === 'beginner' && !hasCompletedBeginnerOnboarding()

  // Show loading spinner while checking auth or config
  if (isLoading || configLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#0B0E11' }}
      >
        <div className="text-center">
          <img
            src="/icons/jmwl.jpg"
            alt="JMWL Logo"
            className="w-16 h-16 mx-auto mb-4 animate-pulse rounded-full"
          />
          <p style={{ color: '#EAECEF' }}>{t('loading', language)}</p>
        </div>
      </div>
    )
  }

  // First-time setup: redirect to /setup if system not initialized
  if (systemConfig && !systemConfig.initialized && !user) {
    return <SetupPage />
  }

  // Handle specific routes regardless of authentication
  if (route === '/login') {
    return <LoginPage />
  }
  if (route === '/setup') {
    // If already initialized, redirect to login
    if (systemConfig?.initialized) {
      window.location.href = '/login'
      return null
    }
    return <SetupPage />
  }
  if (route === '/welcome') {
    if ((!user || !token) && !hasPersistedAuth) {
      window.location.href = '/login'
      return null
    }
    if (getUserMode() !== 'beginner') {
      window.location.href = '/traders'
      return null
    }
  }
  if (route === '/faq') {
    return (
      <div
        className="min-h-screen"
        style={{ background: '#0B0E11', color: '#EAECEF' }}
      >
        <HeaderBar
          isLoggedIn={!!user}
          currentPage="faq"
          language={language}
          onLanguageChange={setLanguage}
          user={user}
          onLogout={logout}
          onLoginRequired={handleLoginRequired}
          onPageChange={navigateToPage}
        />
        <FAQPage />
        <LoginRequiredOverlay
          isOpen={loginOverlayOpen}
          onClose={() => setLoginOverlayOpen(false)}
          featureName={loginOverlayFeature}
        />
      </div>
    )
  }
  if (route === '/reset-password') {
    return <ResetPasswordPage />
  }
  if (route === '/settings') {
    if ((!user || !token) && !hasPersistedAuth) {
      window.location.href = '/login'
      return null
    }
    return (
      <div className="min-h-screen" style={{ background: '#0B0E11', color: '#EAECEF' }}>
        <HeaderBar
          isLoggedIn={!!user}
          language={language}
          onLanguageChange={setLanguage}
          user={user}
          onLogout={logout}
          onLoginRequired={handleLoginRequired}
          onPageChange={navigateToPage}
        />
        <SettingsPage />
      </div>
    )
  }
  // Data page - publicly accessible with embedded dashboard
  if (route === '/data') {
    const dataPageNavigate = (page: Page) => {
      navigateToPage(page)
    }
    return (
      <div
        className="min-h-screen"
        style={{ background: '#0B0E11', color: '#EAECEF' }}
      >
        <HeaderBar
          isLoggedIn={!!user}
          currentPage="data"
          language={language}
          onLanguageChange={setLanguage}
          user={user}
          onLogout={logout}
          onLoginRequired={handleLoginRequired}
          onPageChange={dataPageNavigate}
        />
        <main className="pt-16">
          <DataPage />
        </main>
        <LoginRequiredOverlay
          isOpen={loginOverlayOpen}
          onClose={() => setLoginOverlayOpen(false)}
          featureName={loginOverlayFeature}
        />
      </div>
    )
  }
  // Show landing page for root route
  if (route === '/' || route === '') {
    return <LandingPage />
  }

  // Redirect unauthenticated users to landing page
  if (!user || !token) {
    return <LandingPage />
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: '#0B0E11', color: '#EAECEF' }}
    >
      <HeaderBar
        isLoggedIn={!!user}
        currentPage={currentPage}
        language={language}
        onLanguageChange={setLanguage}
        user={user}
        onLogout={logout}
        onLoginRequired={handleLoginRequired}
        onPageChange={navigateToPage}
      />

      {/* Main Content with Page Transitions */}
      <main className="min-h-screen pt-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            {currentPage === 'competition' ? (
              <CompetitionPage />
            ) : currentPage === 'data' ? (
              <DataPage />
            ) : currentPage === 'strategy-market' ? (
              <StrategyMarketPage />
            ) : currentPage === 'traders' ? (
              <AITradersPage
                onTraderSelect={(traderId) => {
                  setSelectedTraderId(traderId)
                  const trader = traders?.find((item) => item.trader_id === traderId)
                  const url = new URL(window.location.href)
                  url.pathname = '/dashboard'
                  if (trader) {
                    const slug = getTraderSlug(trader)
                    url.searchParams.set('trader', slug)
                    setSelectedTraderSlug(slug)
                  } else {
                    url.searchParams.delete('trader')
                    setSelectedTraderSlug(undefined)
                  }
                  window.history.pushState({}, '', url.toString())
                  setRoute('/dashboard')
                  setCurrentPage('trader')
                }}
              />
            ) : currentPage === 'strategy' ? (
              <StrategyStudioPage />
            ) : (
              <TraderDashboardPage
                selectedTrader={selectedTrader}
                status={status}
                account={effectiveAccount}
                accountFailed={accountPollOff}
                positions={effectivePositions}
                positionsFailed={positionsPollOff}
                decisions={effectiveDecisions}
                decisionsFailed={decisionsPollOff}
                decisionsLimit={decisionsLimit}
                onDecisionsLimitChange={setDecisionsLimit}
                stats={stats}
                lastUpdate={lastUpdate}
                language={language}
                traders={traders}
                tradersError={tradersError}
                selectedTraderId={selectedTraderId}
                onTraderSelect={(traderId) => {
                  setSelectedTraderId(traderId)
                  // 更新 URL 参数（使用 slug: name-id前4位）
                  const trader = traders?.find(t => t.trader_id === traderId)
                  if (trader) {
                    const slug = getTraderSlug(trader)
                    setSelectedTraderSlug(slug)
                    const url = new URL(window.location.href)
                    url.searchParams.set('trader', slug)
                    window.history.replaceState({}, '', url.toString())
                  }
                }}
                onNavigateToTraders={() => {
                  window.history.pushState({}, '', '/traders')
                  setRoute('/traders')
                  setCurrentPage('traders')
                }}
                exchanges={exchanges}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer
          className="mt-16"
          style={{ borderTop: '1px solid #2B3139', background: '#181A20' }}
        >
          <div
            className="max-w-[1920px] mx-auto px-6 py-6 text-center text-sm"
            style={{ color: '#5E6673' }}
          >
            <p>{t('footerTitle', language)}</p>
            <p className="mt-1">{t('footerWarning', language)}</p>
            <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
              {/* YouTube */}
              <a
                href={OFFICIAL_LINKS.youtube}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 rounded text-sm font-semibold transition-all hover:scale-105"
                style={{
                  background: '#1E2329',
                  color: '#848E9C',
                  border: '1px solid #2B3139',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#2B3139'
                  e.currentTarget.style.color = '#EAECEF'
                  e.currentTarget.style.borderColor = '#FF0000'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#1E2329'
                  e.currentTarget.style.color = '#848E9C'
                  e.currentTarget.style.borderColor = '#2B3139'
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="#FF0000"
                >
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
                YouTube
              </a>
              {/* Twitter/X */}
              <a
                href={OFFICIAL_LINKS.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 rounded text-sm font-semibold transition-all hover:scale-105"
                style={{
                  background: '#1E2329',
                  color: '#848E9C',
                  border: '1px solid #2B3139',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#2B3139'
                  e.currentTarget.style.color = '#EAECEF'
                  e.currentTarget.style.borderColor = '#1DA1F2'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#1E2329'
                  e.currentTarget.style.color = '#848E9C'
                  e.currentTarget.style.borderColor = '#2B3139'
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="#E7E9EA"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Twitter
              </a>
              {/* Telegram */}
              <a
                href={OFFICIAL_LINKS.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 rounded text-sm font-semibold transition-all hover:scale-105"
                style={{
                  background: '#1E2329',
                  color: '#848E9C',
                  border: '1px solid #2B3139',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#2B3139'
                  e.currentTarget.style.color = '#EAECEF'
                  e.currentTarget.style.borderColor = '#26A5E4'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#1E2329'
                  e.currentTarget.style.color = '#848E9C'
                  e.currentTarget.style.borderColor = '#2B3139'
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="#26A5E4"
                >
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
                Telegram
              </a>
            </div>
          </div>
        </footer>

      {/* Login Required Overlay */}
      <LoginRequiredOverlay
        isOpen={loginOverlayOpen}
        onClose={() => setLoginOverlayOpen(false)}
        featureName={loginOverlayFeature}
      />

      {showBeginnerOnboarding && <BeginnerOnboardingPage />}
    </div>
  )
}


// Wrap App with providers
export default function AppWithProviders() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ConfirmDialogProvider>
          <App />
        </ConfirmDialogProvider>
      </AuthProvider>
    </LanguageProvider>
  )
}
