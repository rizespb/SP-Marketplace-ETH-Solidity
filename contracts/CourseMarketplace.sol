// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract CourseMarketplace {
    enum State {
        Purchased,
        Activated,
        Deactivated
    }

    // Флаг, который останаливает работу контракта
    // Например, если мы хотим приостановить работу магазина
    bool public isStopped = false;

    // struct - это как объект в JS
    struct Course {
        uint256 id; // 32 байта
        uint256 price; // 32 байта
        bytes32 proof; // 32 байта
        address owner; // 20 байт
        State state; // 1 байт
    }

    // mapping courseHash to Course data
    mapping(bytes32 => Course) public ownedCourses;

    // mapping of courseID to courseHash
    mapping(uint256 => bytes32) public ownedCourseHash;

    // Количество купленных курсов
    // id каждого следующего купленного курса будет формироваться на основе общего количества купленных курсов
    uint256 private totalOwnedCourses;

    // Владелец контракта (в struct Course мы работаем с другим: с владельцем (покупателем) курса)
    address payable private owner;

    constructor() {
        // owner = payable(newOwner);
        // Не понял, зачем сделали таким образом, а не как обычно. Возможно, такой code-style
        setContractOwner(msg.sender);
    }

    // Ошибка: у этого аккаунта уже куплен курс
    // Три подряд /// над объявлением ошибки задают error message этой ошибки
    /// Course has alredy a Owner
    error CourseHasOwner();

    /// Only owner has an access
    error OnlyOwner();

    /// Course has invalid state!
    error InvalidState();

    /// Course is not created!
    error CourseIsNotCreated();

    /// Sender is not course owner!
    error SenderIsNotCourseOwner();

    modifier onlyOwner() {
        if (msg.sender != getContractOwner()) {
            // Если транзакцию вызывает не владелец, отменяем транзакцию с ошибкой
            revert OnlyOwner();
        }
        _;
    }

    modifier onlyWhenNotStopped() {
        require(!isStopped);
        _;
    }

    modifier onlyWhenStopped() {
        require(isStopped);
        _;
    }

    // Функция для приема переводов денег в контракт (например, если по каким-то причинам надо пополнить баланс контракта)
    receive() external payable {}

    // Отправка денег с баланса контракта на счет owner
    function withdraw(uint256 amount) external onlyOwner {
        (bool success, ) = owner.call{value: amount}("");
        require(success, "Transfer failed.");
    }

    // Функция для экстренного вывода всех средств на счет владельца
    function emergencyWithdraw() external onlyWhenStopped onlyOwner {
        (bool success, ) = owner.call{value: address(this).balance}("");
        require(success, "Transfer failed.");
    }

    // Функция удаления контракта из сети
    function selfDestruct() external onlyWhenStopped onlyOwner {
        // selfdestruct - уберет контракт из сети, баланс контракта будет переведен на счет переданного аккунта
        selfdestruct(owner);
    }

    // Функция для остановки работы контракта (остановки работы магазина)
    function stopContract() external onlyOwner {
        isStopped = true;
    }

    // Функция для возобновления работы контракта (возобновления работы магазина)
    function resumeContract() external onlyOwner {
        isStopped = false;
    }

    function purchaseCourse(bytes16 courseId, bytes32 proof)
        external
        payable
        onlyWhenNotStopped
    {
        // Кодируенм в хэш id курса и адрес отправителя
        // Т.о. хэшкурса будет содержать инфу о купленном курсе и о том, кто купил. И его можно использовать для верификации: был ли определнным аккаунтом куплен определнный курс
        // abi.encodePacked мы используем для того, чтобы передать в keccak несколько аргументов
        bytes32 courseHash = keccak256(abi.encodePacked(courseId, msg.sender));

        // Проверяет, отправитель транзакции покупал уже этот курс или нет
        if (hasCourseOwnership(courseHash)) {
            // Если ранее уже покапал этот курс, отменяем транзауию с ошибкой
            revert CourseHasOwner();
        }

        uint256 id = totalOwnedCourses++;

        // Сохраяем по id хэш курса
        ownedCourseHash[id] = courseHash;

        // По хэшу курса сохраняем информацию о купленном курсе
        ownedCourses[courseHash] = Course({
            id: id,
            price: msg.value,
            proof: proof,
            owner: msg.sender,
            state: State.Purchased
        });
    }

    // Функция для повторной покупки курса после того, как курс был Deactivated и за него вернули деньги покупателю
    function repurchaseCourse(bytes32 courseHash)
        external
        payable
        onlyWhenNotStopped
    {
        if (!isCourseCreated(courseHash)) {
            revert CourseIsNotCreated();
        }

        if (!hasCourseOwnership(courseHash)) {
            revert SenderIsNotCourseOwner();
        }

        Course storage course = ownedCourses[courseHash];

        if (course.state != State.Deactivated) {
            revert InvalidState();
        }

        course.state = State.Purchased;
        course.price = msg.value;
    }

    // Функция активации курса (после покупки админ должен активировать курс)
    // Так как мы используем Course storage, изменяя переменную course будет ихменяться соответствующая информация в ownedCourses
    // Если бы использовали memory, то мутация локальной переменной не затронула бы данные в контракте
    function activateCourse(bytes32 courseHash)
        external
        onlyWhenNotStopped
        onlyOwner
    {
        if (!isCourseCreated(courseHash)) {
            revert CourseIsNotCreated();
        }

        Course storage course = ownedCourses[courseHash];

        if (course.state != State.Purchased) {
            revert InvalidState();
        }

        course.state = State.Activated;
    }

    // Деактивация возможна только для курсов, которые еще НЕ были активированы
    // Например, админ не хочет активировать этот курс
    // Данная функция также вернет деньги покупателю
    function deactivateCourse(bytes32 courseHash)
        external
        onlyWhenNotStopped
        onlyOwner
    {
        if (!isCourseCreated(courseHash)) {
            revert CourseIsNotCreated();
        }

        Course storage course = ownedCourses[courseHash];

        if (course.state != State.Purchased) {
            revert InvalidState();
        }

        // Возвращаем деньги покупателю курса
        // Это результат транзакции.
        // На первом месте - успешно или нет, на втором месте - data (в данном случае нам не важна data)
        (bool success, ) = course.owner.call{value: course.price}("");

        // Только если деньги возвращены покупателю, меняем статус курса на Deactivated
        require(success, "Transfer failed");

        course.state = State.Deactivated;
        course.price = 0;
    }

    // Функция смены владельца контракта
    function transferOwnership(address newOwner) external onlyOwner {
        setContractOwner(newOwner);
    }

    // Вовзращает общее количество проданных курсов
    function getCourseCount() external view returns (uint256) {
        return totalOwnedCourses;
    }

    // Вовзращает хэш курса из mapping ownedCourseHash по индексу
    function getCourseHashAtIndex(uint256 index)
        external
        view
        returns (bytes32)
    {
        return ownedCourseHash[index];
    }

    // Вовзращает курс struct Course из mapping ownedCourses по хэшу курса
    function getCourseByHash(bytes32 courseHash)
        external
        view
        returns (Course memory)
    {
        return ownedCourses[courseHash];
    }

    // Функция возвращает адрес владельца контракта
    function getContractOwner() public view returns (address) {
        return owner;
    }

    // Функция устанавливает владельца контракта
    function setContractOwner(address newOwner) private {
        owner = payable(newOwner);
    }

    // Функция проверяет, есть ли курс с таким хэшем (была ли покупка курса с таким хэшем)
    function isCourseCreated(bytes32 courseHash) private view returns (bool) {
        return
            ownedCourses[courseHash].owner !=
            0x0000000000000000000000000000000000000000;
    }

    // Проверяет, отправитель транзакции покупал уже этот курс или нет?
    function hasCourseOwnership(bytes32 courseHash)
        private
        view
        returns (bool)
    {
        return ownedCourses[courseHash].owner == msg.sender;
    }
}

// CoureseID = 0x00000000000000000000000000003130 (=== '10')
// proof = 0x0000000000000000000000000000313000000000000000000000000000003130
//
