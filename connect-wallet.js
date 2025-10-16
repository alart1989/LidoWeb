// public/connect-wallet.js
import { createConfig, http } from 'wagmi'
import { mainnet } from 'viem/chains'
import { createAppKit } from '@reown/appkit' // core API (без react)

// 1) wagmi-конфіг (додай свої мережі за потреби)
const config = createConfig({
  chains: [mainnet],
  transports: { [mainnet.id]: http() }, // або http('https://...') свій RPC
})

// 2) ініт AppKit (отримуємо інстанс з .open())
const appKit = createAppKit({
  config,              // wagmi-конфіг
  themeMode: 'system', // 'dark' | 'light' | 'system'
  // інші опції: locale, featuredWallets, зображення логотипу тощо
})

// 3) привʼязка до існуючої кнопки
function bindConnectButtons() {
  const buttons = document.querySelectorAll('button[data-testid="connectBtn"]')
  buttons.forEach(btn => {
    // уникаємо дубляжу хендлерів при hot-reload
    if (!btn.__appKitBound) {
      btn.addEventListener('click', () => appKit.open())
      btn.__appKitBound = true
    }
  })
}

// DOM готовий → вʼяжемо
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindConnectButtons)
} else {
  bindConnectButtons()
}
