import Web3 from 'web3'
import { handler as createAccountHook } from './useAccount'
import { handler as createNetworkHook } from './useNetwork'
import { handler as createOwnedCoursesHook } from './useOwnedCourses'
import { handler as createOwnedCourseHook } from './useOwnedCourse'
import { handler as createManagedCoursesHook } from './useManagedCourses'

// Немного сложная структура из нескольких файлов и методов для того, чтобы просто в контекст Web3Context прокинутьь все создаваемые кастомные хуки, связанные с web3
// export const setupHooks = (web3, provider) => {
export const setupHooks = ({ web3, provider, contract }) => {
  return {
    useAccount: createAccountHook(web3, provider),
    useNetwork: createNetworkHook(web3),
    useOwnedCourses: createOwnedCoursesHook(web3, contract),
    useOwnedCourse: createOwnedCourseHook(web3, contract),
    useManagedCourses: createManagedCoursesHook(web3, contract),
  }
}
