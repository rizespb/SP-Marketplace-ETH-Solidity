// Доступ к artifacts предоставляет Truffle
const CourseMarketplace = artifacts.require('CourseMarketplace')

const { catchRevert } = require('./utils/exceptions')
// Mocha - testing framework
// Chai - assertion JS library

// хелпер для проверки баланса любого аккаунта
const getBalance = async (address) => web3.eth.getBalance(address)

// хелпер превращает число в Big Number
// Работая с Wei удобно использовать Big Number, т.к. Wei является BigNumber
const toBN = (value) => web3.utils.toBN(value)

// Функция ниже - это последовательность операций из теста Repurchase course -> should NOT be able to repurchase purchased course
// Я не стал выносить эти команды из теста - там есть более подробное описание
// Но эта функция в дальнейшем используется еще в паре тестов
const getGas = async (result) => {
  const tx = await web3.eth.getTransaction(result.tx)
  const gasUsed = toBN(result.receipt.gasUsed)
  const gasPrice = toBN(tx.gasPrice)
  const gas = gasUsed.mul(gasPrice)
  return gas
}

// Мы получем изолированную среду нашего контракта, а в коллбэк будут переданы аккаунты, доступные в тестовой сети
contract('CourseMarketplace', (accounts) => {
  // Тестовые значения для покупки курса
  const courseId = '0x00000000000000000000000000003130'
  const proof = '0x0000000000000000000000000000313000000000000000000000000000003130'

  const courseId2 = '0x00000000000000000000000000002130'
  const proof2 = '0x0000000000000000000000000000213000000000000000000000000000002130'
  const value = '900000000'

  let _contract = null
  let contractOwner = null
  let buyer = null
  let courseHash = null

  // Выполнится перед каждым тестом
  before(async () => {
    // Разворачиваем контракт
    _contract = await CourseMarketplace.deployed()

    contractOwner = accounts[0]
    buyer = accounts[1]
  })

  describe('Purchase the new course', () => {
    // Будем имитировать покупку курса перед каждым тестом
    before(async () => {
      await _contract.purchaseCourse(courseId, proof, {
        from: buyer,
        value,
      })
    })

    // Проверяем, что купленный ранее курс нельяз купить повторно с того же самого аккаунта
    it('should not allowed to repurchase already owned course', async () => {
      await catchRevert(
        _contract.purchaseCourse(courseId, proof, {
          from: buyer,
          value,
        })
      )
    })

    it('can get the purchased course hash by index', async () => {
      // Индекс равен 0, т.к. мы покупаем один курс, который будет иметь индекс 0
      const index = 0
      courseHash = await _contract.getCourseHashAtIndex(index)

      // Создаем хэш, который ожидаем получить из контакрта с помощью getCourseHashAtIndex()
      // soliditySha3 - это keccak256 в web3 (см. также sha3)
      const expectedHash = web3.utils.soliditySha3(
        {
          type: 'bytes16',
          value: courseId,
        },
        {
          type: 'address',
          value: buyer,
        }
      )

      // assert - предоставляется Chai. Если первый аргумент истинный, то тест ПРОШЕЛ УСПЕШНО
      // Втрой аргумент - сообщение об ошибке, если тест упал
      assert.equal(courseHash, expectedHash, 'Course hash is not matching the one created with keccak256')
    })

    it('sholud match the data of the course purchased by buyer', async () => {
      // Индекс равен 0, т.к. мы покупаем один курс, который будет иметь индекс 0
      const expectedIndex = 0
      // Сразу после покупки у курса должен быть enum State.Purchased, который соответствует 0
      const expectedState = 0

      // courseHash рассчитывается в тесте it('can get the purchased course hash by index'
      const course = await _contract.getCourseByHash(courseHash)

      assert.equal(course.id, expectedIndex, 'Course index should be 0!')
      assert.equal(course.price, value, `Course price should be ${value}!`)
      assert.equal(course.proof, proof, `Course proof should be ${proof}!`)
      assert.equal(course.owner, buyer, `Course buyer should be ${buyer}!`)
      assert.equal(course.state, expectedState, `Course state should be ${expectedState}!`)
    })
  })

  describe('Activate the purchased course', () => {
    it('should NOT be able to activate course by NOT contract owner', async () => {
      // try {
      //   // Пытаемся активировать курс с другого аккаунта, не владельца контракта
      //   await _contract.activateCourse(courseHash, { from: buyer })
      // } catch (error) {
      //   console.log(error.message)
      //   // Проверяем, что ошибка должна быть в принципе
      //   assert(error, "Expected an error but didn't get one")
      // }

      await catchRevert(_contract.activateCourse(courseHash, { from: buyer }))
    })

    it('should has "activated" state', async () => {
      // courseHash рассчитывается в тесте it('can get the purchased course hash by index'
      await _contract.activateCourse(courseHash, { from: contractOwner })

      const course = await _contract.getCourseByHash(courseHash)

      // Активированный курс должен быть enum State.Activated, который соответствует 1
      const expectedState = 1

      assert.equal(course.state, expectedState, `Course should has "activated" state`)
    })

    describe('Transfer Ownership', () => {
      let currentOwner = null

      before(async () => {
        currentOwner = await _contract.getContractOwner()
      })

      it('getContractOwner sholud return deployer address', async () => {
        assert.equal(contractOwner, currentOwner, 'Contract Owner is not matching the one from getContractOwner')
      })

      it('sholud NOT transfer ownership when contract owner is not sending transaction', async () => {
        // Пробуем выполнить функция transferOwnership НЕ от имени владельца контракта (того, кто развернул контракт)
        await catchRevert(
          _contract.transferOwnership(accounts[3], {
            from: accounts[4],
          })
        )
      })

      it('sholud transfer ownership to 3rd address from "accounts"', async () => {
        // А теперь transferOwnership выполняем от имени владельца
        await _contract.transferOwnership(accounts[2], {
          from: currentOwner,
        })

        const owner = await _contract.getContractOwner()

        assert.equal(owner, accounts[2], 'Contract owner is not the second account')
      })

      it('sholud transfer ownership back to initial contract owner', async () => {
        // А теперь transferOwnership выполняем от имени владельца
        await _contract.transferOwnership(contractOwner, {
          from: accounts[2],
        })

        const owner = await _contract.getContractOwner()

        assert.equal(owner, contractOwner, 'Contract owner is not set')
      })
    })
  })

  describe('Deactivate course', () => {
    let courseHash2 = null
    let currentOwner = null

    before(async () => {
      await _contract.purchaseCourse(courseId2, proof2, { from: buyer, value })
      courseHash2 = await _contract.getCourseHashAtIndex(1)
      currentOwner = await _contract.getContractOwner()
    })

    it('should NOT be able to deactivate the course by NOT contract owner', async () => {
      await catchRevert(_contract.deactivateCourse(courseHash2, { from: buyer }))
    })

    it('should have status of deactivated and price 0', async () => {
      const beforeTxBuyerBalance = await getBalance(buyer)
      const beforeTxContractBalance = await getBalance(_contract.address)
      const beforeTxOwnerBalance = await getBalance(currentOwner)

      // Транзакция для деактивации отправляется собственником контракта
      const result = await _contract.deactivateCourse(courseHash2, { from: contractOwner })

      const afterTxBuyerBalance = await getBalance(buyer)
      const afterTxContractBalance = await getBalance(_contract.address)
      const afterTxOwnerBalance = await getBalance(currentOwner)

      const course = await _contract.getCourseByHash(courseHash2)

      // Ожидамый статус должен быть равен enum State.Deactivated, что соответствует 2
      const expectedState = 2
      // При деактивации стоимость price становится 0
      const expectedPrice = 0

      // Получаем количество газа из транзакции _contract.deactivateCourse с помощью функции-хелпера getGas()
      const gas = await getGas(result)

      assert.equal(course.state, expectedState, 'Course is not deactivated!')
      assert.equal(course.price, expectedPrice, 'Course price is not 0!')

      // Wei  - это Big Number
      // У Big Number доступен методы sub - вычитание из числа, на котором он вызван
      // Сравниваем баланс, из которого вычитаем стоимость газа, с итоговым балансом на счету владельца контракта после покупки
      assert.equal(toBN(beforeTxOwnerBalance).sub(gas).toString(), afterTxOwnerBalance, 'Contract owner ballance is not correct')

      assert.equal(toBN(beforeTxBuyerBalance).add(toBN(value)).toString(), afterTxBuyerBalance, 'Buyer ballance is not correct')

      assert.equal(toBN(beforeTxContractBalance).sub(toBN(value)).toString(), afterTxContractBalance, 'Contract ballance is not correct')
    })

    it('should NOT be able to activate deactivated course', async () => {
      await catchRevert(_contract.activateCourse(courseHash2, { from: buyer }))
    })
  })

  describe('Repurchase course', () => {
    let courseHash2 = null

    before(async () => {
      courseHash2 = await _contract.getCourseHashAtIndex(1)
    })

    it("should NOT repurchase when the course doesn't exist", async () => {
      const notExistingHash = '0x5ceb3f8075c3dbb5d490c8d1e6c950302ed065e1a9031750ad2c6513069e3fc3'
      await catchRevert(_contract.repurchaseCourse(notExistingHash, { from: buyer }))
    })

    it('should NOT repurchase with NOT course owner', async () => {
      const notOwnerAddress = accounts[2]
      await catchRevert(_contract.repurchaseCourse(courseHash2, { from: notOwnerAddress }))
    })

    it('should be able repurchase with the original buyer', async () => {
      // Баланс покупателя до повторной покупки
      const beforeTxBuyerBalance = await getBalance(buyer)
      // Баланс контракта до покупки
      const beforeTxContractBalance = await getBalance(_contract.address)

      // Повторная покупка курса
      const result = await _contract.repurchaseCourse(courseHash2, { from: buyer, value })

      // Получаем транзакцию этой покупки
      // Это не то же самое, что result - он содержит результат выполнения транзакции
      const tx = await web3.eth.getTransaction(result.tx)

      // Баланс покупателя после повторной покупки
      const afterTxBuyerBalance = await getBalance(buyer)
      //  Баланс контракта после покупки
      const afterTxContractBalance = await getBalance(_contract.address)

      // ПОлучаем газ из транзакции и конвертируем в Big Number
      const gasUsed = toBN(result.receipt.gasUsed)
      const gasPrice = toBN(tx.gasPrice)
      // Чтобы посчитать газ импножаем использованный газ на цену газа
      const gas = gasUsed.mul(gasPrice)

      const course = await _contract.getCourseByHash(courseHash2)
      const exptectedState = 0

      assert.equal(course.state, exptectedState, 'The course is not in purchased state')
      assert.equal(course.price, value, `The course price is not equal to ${value}`)

      // Wei  - это Big Number
      // У Big Number доступен методы sub - вычитание из числа, на котором он вызван
      // Сравниваем баланс, из которого вычитаем цену курса и стоимость газа, с итоговым балансом на счету покупателя после покупки
      assert.equal(toBN(beforeTxBuyerBalance).sub(toBN(value)).sub(gas).toString(), afterTxBuyerBalance, 'Client balance is not correct!')

      assert.equal(toBN(beforeTxContractBalance).add(toBN(value)).toString(), afterTxContractBalance, 'Contract balance is not correct!')
    })

    it('should NOT be able to repurchase purchased course', async () => {
      await catchRevert(_contract.repurchaseCourse(courseHash2, { from: buyer }))
    })
  })

  describe('Receive funds', () => {
    it('should have transacted funds', async () => {
      // 0.1 ETH в Wei
      const value = '100000000000000000'

      // Получаем текущий баланс контракта
      const contractBeforeTx = await getBalance(_contract.address)

      // Тестовая отправка денег без покупки (просто отправка денег через Metamask) в адрес контракта
      await web3.eth.sendTransaction({
        from: buyer,
        to: _contract.address,
        value,
      })

      // Баланс контракта после транзакции
      const contractAfterTx = await getBalance(_contract.address)

      // Сверяем баланс, используя Big Number (смотри выше)
      assert.equal(toBN(contractBeforeTx).add(toBN(value)).toString(), contractAfterTx, 'Value after transaction is not matching!')
    })
  })

  // Тестируем функция withdraw
  describe('Normal withdraw', () => {
    // 0.1 ETH в Wei
    const fundsToDeposit = '100000000000000000'
    // Для попытки вывести сумму сверх баланса контракта
    const overLimitFunds = '999999000000000000000'
    let currentOwner = null

    before(async () => {
      currentOwner = await _contract.getContractOwner()

      // Отправляем деньги в контракт от buyer
      await web3.eth.sendTransaction({
        from: buyer,
        to: _contract.address,
        value: fundsToDeposit,
      })
    })

    // withdraw должна вызываться только владельцем
    it('should fail when withdrawing with NOT owner address', async () => {
      const value = '10000000000000000'
      await catchRevert(_contract.withdraw(value, { from: buyer }))
    })

    // withdraw должна завершатся с ошибкой, если сумма транзакции превышает баланс контракта
    it('should fail when withdrawing OVER limit balance', async () => {
      await catchRevert(_contract.withdraw(overLimitFunds, { from: currentOwner }))
    })

    it('should have +0.1ETH after withdraw', async () => {
      const ownerBalance = await getBalance(currentOwner)

      // От имени владельца вызываем withdraw, которая отправит сумму fundsToDeposit на счет владельца
      const result = await _contract.withdraw(fundsToDeposit, { from: currentOwner })

      // Баланс владельца после транзакции
      const newOwnerBalance = await getBalance(currentOwner)

      // Получаем газ из транзакции
      const gas = await getGas(result)

      // Начальный балан собственника + сумму переведенных средств - стоимость газа должны равняться новому балансу владельца
      assert.equal(toBN(ownerBalance).add(toBN(fundsToDeposit)).sub(toBN(gas)).toString(), newOwnerBalance, 'The new owner balance is not correct!')
    })
  })

  // Тестируем emergencyWithdraw - экстренный вывод средств из контракта
  describe('Emergency withdraw', () => {
    let currentOwner

    // Получаем текущего владельца контракта
    before(async () => {
      currentOwner = await _contract.getContractOwner()
    })

    // Выполняется после тестов
    // Возобновляем контракт (isStopped = false)
    after(async () => {
      await _contract.resumeContract({ from: currentOwner })
    })

    // emergencyWithdraw должна выполняться только, если контракт остановлен
    it('should fail when contract is NOT stopped', async () => {
      await catchRevert(_contract.emergencyWithdraw({ from: currentOwner }))
    })

    // Баланс владельца должен
    it('should have +contract funds on contract owner', async () => {
      // Останавливаем контрак (isStopped = true)
      await _contract.stopContract({ from: contractOwner })

      // Получаем балансы контракта и владельца
      const contractBalance = await getBalance(_contract.address)
      const ownerBalance = await getBalance(currentOwner)

      // Экстренный вывод средств (выводятся все средства со счета контракта)
      const result = await _contract.emergencyWithdraw({ from: currentOwner })
      // Получаем стоимость газа в транзакции
      const gas = await getGas(result)

      // Новый баланс владельца
      const newOwnerBalance = await getBalance(currentOwner)

      // Начальный балан собственника + сумму переведенных средств (весь баланс контракта) - стоимость газа должны равняться новому балансу владельца
      assert.equal(toBN(ownerBalance).add(toBN(contractBalance)).sub(gas), newOwnerBalance, "Owner doesn't have contract balance")
    })

    // После emergencyWithdraw баланс контракта должен стать 0
    it('should have contract balance of 0', async () => {
      const contractBalance = await getBalance(_contract.address)

      assert.equal(contractBalance, 0, "Contract does't have 0 balance")
    })
  })

  // Тестируем деструктуризация контракта
  // (Убираем контракт из сети)
  describe('Self Destruct', () => {
    let currentOwner

    // Перед тестами получаем владельца контракта
    before(async () => {
      currentOwner = await _contract.getContractOwner()
    })

    // selfDestruct не должна запускаться, если контракт не остановлен
    it('should fail when contract is NOT stopped', async () => {
      await catchRevert(_contract.selfDestruct({ from: currentOwner }))
    })

    // selfDestruct должна перевести все средства со счета контракта на счет владельца
    it('should have +contract funds on contract owner', async () => {
      // Останавливаем контракт (isStopped = true)
      await _contract.stopContract({ from: contractOwner })

      // Получаем балансы контракта и владельца
      const contractBalance = await getBalance(_contract.address)
      const ownerBalance = await getBalance(currentOwner)

      // Вызываем selfDestruct
      const result = await _contract.selfDestruct({ from: currentOwner })
      // Получаем стоимость газа за выполнение транзакции
      const gas = await getGas(result)

      // Новый баланс владельца
      const newOwnerBalance = await getBalance(currentOwner)

      // Начальный балан собственника + сумму переведенных средств (весь баланс контракта) - стоимость газа должны равняться новому балансу владельца
      assert.equal(toBN(ownerBalance).add(toBN(contractBalance)).sub(gas), newOwnerBalance, "Owner doesn't have contract balance")
    })

    // Балан контракта после selfDestruct должен равняться 0
    it('should have contract balance of 0', async () => {
      const contractBalance = await getBalance(_contract.address)

      assert.equal(contractBalance, 0, "Contract does't have 0 balance")
    })

    // Контракт должен быть удален из сети
    // Код контракта должен быть 0x
    it('should have 0x bytecode', async () => {
      const code = await web3.eth.getCode(_contract.address)

      assert.equal(code, '0x', 'Contract is not destroyed')
    })
  })
})
