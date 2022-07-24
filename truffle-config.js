// Пакет для подписывания транзакций при разворачивании в Ropsten или MainNet
const HDWalletProvider = require('@truffle/hdwallet-provider')

const keys = require('./keys.json')

module.exports = {
  // Указываем папку с контрактами
  contracts_build_directory: './public/contracts',
  networks: {
    development: {
      host: '127.0.0.1', // Localhost (default: none)
      port: 7545, // Standard Ethereum port (default: none)
      network_id: '*', // Any network (default: none)
    },
    // Настройки для деплоя в Ropsten
    ropsten: {
      provider: () =>
        new HDWalletProvider({
          mnemonic: {
            phrase: keys.MNEMONIC,
          },
          providerOrUrl: `https://ropsten.infura.io/v3/${keys.INFURA_PROJECT_ID}`,
          // Порядковый номер аккаунт в локальном кошельке Метамаск (счет начинается с 0) Смотри в файле Ethereum and Solidity.docx
          addressIndex: 0,
        }),
      // Постоянный Network ID Ropsten
      network_id: 3,
      gas: 5500000, // Максимальное количество газа, которое мы готовы потратить на транзакцию
      gasPrice: 20000000000, // максимальная цена газа, которую мы готовы платить за 1 единицу газа в Wei
      confirmations: 2, // если мы деплоим несколько контрактов, то это будет число блоков после первой транзакции (деплой первого контракта), которое надо подождать перед следующей транзакцией (деплой следующего контракта). Эти блоки, которые мы ждем, будут заполнены другими (не нашими транзакциями)
      timeoutBlocks: 200, // допустим, транзакция по деплою попала в mempool, но из-за низкой стоимости газа ее никто не берет в рассчеты. Сколько блоков мы будем ждать, прежде, чем транзакция вернется обратно невыполненной. В этом случае, надо, например, увеличить стоимость газа
    },
    // Окончание настроек для Ropsten
    // Настройки для MainNet
    live: {
      provider: () =>
        new HDWalletProvider({
          mnemonic: {
            phrase: keys.MNEMONIC,
          },
          providerOrUrl: `https://mainnet.infura.io/v3/${keys.INFURA_PROJECT_ID}`,
          // Порядковый номер аккаунт в локальном кошельке Метамаск (счет начинается с 0) Смотри в файле Ethereum and Solidity.docx
          addressIndex: 0,
        }),
      // Постоянный Network ID MainNet
      network_id: 1,
      gas: 2500000, // Максимальное количество газа, которое мы готовы потратить на транзакцию
      gasPrice: 7000000000, // максимальная цена газа, которую мы готовы платить за 1 единицу газа в Wei
      confirmations: 2, // если мы деплоим несколько контрактов, то это будет число блоков после первой транзакции (деплой первого контракта), которое надо подождать перед следующей транзакцией (деплой следующего контракта). Эти блоки, которые мы ждем, будут заполнены другими (не нашими транзакциями)
      timeoutBlocks: 200, // допустим, транзакция по деплою попала в mempool, но из-за низкой стоимости газа ее никто не берет в рассчеты. Сколько блоков мы будем ждать, прежде, чем транзакция вернется обратно невыполненной. В этом случае, надо, например, увеличить стоимость газа
      skipDryRun: true, // Пропустить симуляцию и сразу деплоить (для MainNet). Пропускаем, т.к. до этого уже попробовали развернуть в Ropsten - для MainNet все должно пройти также
    },
    // Окончание настроек для MainNet
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: '0.8.4', // Указываем версию Солидити точно. По умолчанию будет применена версия Солидити из Траффл
    },
  },
}

// Максимальная цена деплоя контракта в сеть Ropsten
// 5500000 * 20000000000 = 110000000000000000 = 0,11 ETH => 334 USD

// transaction hash: 0xdb73dd61c92d612f616946ee3d36b23572b57a2a354bef4e43749744a5ce408e
// contract address: 0x578e8d96a822Cd17a890976b8D3E679d632e0126

// Расчет платы за транзакцию
// BASE FEE - определяется сетью Эфириум =>  8.644545223 GWei
// Max Priority (Tip - чаевые) => 2 GWei
// GAS PRICE = BASE FEE + TIP => 10.644545223 GWei
// GAS USED = 21000
// Transaction Fee = GAS PRICE * GAS USED  = 10.644545223 * 21000 = 223 535,449683
// BURNT FEE = BASE FEE * GAS USED = 8.644545223 * 21000 = 181 535,449683
// REST TO MINER = TIP * GAS USED = 2 * 21000 = 42000

// # Во время разработки используем Chain Id, которую предоставляет Ganache
// NEXT_PUBLIC_TARGET_CHAIN_ID=1337

// # Во время production используем Network Id Ganache
// NEXT_PUBLIC_NETWORK_ID=5777
