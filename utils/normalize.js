// Нормализуем полученные данные ownedCourse, которые поступают из контракта в виде struct Course (приведем к удобному виду)

// Соответствие с emun из контракта enum State {Purchased, Activated, Deactivated}
export const COURSE_STATES = {
  0: 'purchased',
  1: 'activated',
  2: 'deactivated',
}

// course - оригинальный курс, который прихошел ранее с бэка и продается на странице marketplace
// ownedCourse - курс, полученный из контракта
export const normalizeOwnedCourse = (web3) => (course, ownedCourse) => {
  return {
    ...course,
    ownedCourseId: ownedCourse.id,
    proof: ownedCourse.proof,
    owned: ownedCourse.owner,
    // Переводим Wei в ETH
    price: web3.utils.fromWei(ownedCourse.price),
    state: COURSE_STATES[ownedCourse.state],
  }
}
