// CourseMarketplace - название контракта
const CourseMarketplaceMigrations = artifacts.require('CourseMarketplace')

module.exports = function (deployer) {
  deployer.deploy(CourseMarketplaceMigrations)
}
