var read = require('fs-readdir-recursive')
var pluralize = require('pluralize')
var fs = require('fs')
var path = require('path')

var schemaFolderTest = /(?:^|\/)schemas\/([^\/]+).json$/
var schemaPodTest = /(?:^|\/)([^\/]+)\/schema.json$/

module.exports = function loadSchemas(appFolder) {
  var appFiles = read(appFolder)
  var schemas = {}
  for (var k in appFiles) {
    var file = appFiles[k]
    var name = file.match(schemaFolderTest)
    if (!name) name = file.match(schemaPodTest)
    if (!name) break
    name = name[1]
    var o
    try {
      o = JSON.parse(fs.readFileSync(path.join(appFolder, file)))
    } catch (e) {
      console.error(`Failed parsing ${name} schema:`)
      throw e
    }
    schemas[pluralize(name)] = o
  }
  return schemas
}
