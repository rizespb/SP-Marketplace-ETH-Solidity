// Неоптимальное решение
// export const loadContract = async (name, provider) => {
//   // Загружаем контракт из папки, куда компилируются контракты (public/contracts)
//   const res = await fetch(`/contracts/${name}.json`)
//   const Artifact = await res.json()

//   //Для того, чтобы появился глобальный window.TruffleContract, мы копировали код из node_modules\@truffle\contract\dist\truffle-contract.min.js в public\js\truffle-contract.js и подключали этот скрипт через Script в layout
//   // Решение номер 2 в моей доке
//   const _contract = window.TruffleContract(Artifact)
//   _contract.setProvider(provider)

//   let deployedContract = null

//   try {
//     deployedContract = await _contract.deployed()
//   } catch {
//     console.log(`Contract ${name} cannot be loaded`)
//   }

//   return deployedContract
// }

// Более оптимальное решение
const NETWORK_ID = process.env.NEXT_PUBLIC_NETWORK_ID

export const loadContract = async (name, web3) => {
  // Загружаем контракт из папки, куда компилируются контракты (public/contracts)
  const res = await fetch(`/contracts/${name}.json`)
  const Artifact = await res.json()

  let contract = null

  try {
    // Вторым параметром передаем ID сети, в которой был развернут контракт
    // Если разворачивали локально в Ganache, то Network ID можем найти в файле с компилированным контрактом public\contracts\CourseMarketplace.json найти свойство "networks"
    // В целом в env мы задаем заранее этот id для dev и для prod
    contract = new web3.eth.Contract(Artifact.abi, Artifact.networks[NETWORK_ID].address)
  } catch {
    console.log(`Contract ${name} cannot be loaded`)
  }

  return contract
}
