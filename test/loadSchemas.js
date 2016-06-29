var test = require('tape')
var path = require('path')

var JSONAPI = require('..')

test('is available on the root export', t => {
  t.plan(1)
  t.equal(typeof JSONAPI.loadSchemas, 'function')
})

test('finds schemas in the schemas folder', t => {
  var schemas = JSONAPI.loadSchemas(path.join(__dirname, 'fixtures/success'))
  t.plan(1)
  t.ok(schemas.folders)
})

test('finds schemas in a pod folder', t => {
  var schemas = JSONAPI.loadSchemas(path.join(__dirname, 'fixtures/success'))
  t.plan(1)
  t.ok(schemas.pods)
})

test('properly parses schemas', t => {
  var schemas = JSONAPI.loadSchemas(path.join(__dirname, 'fixtures/success'))
  t.plan(2)
  t.deepEqual(schemas.pods, { name: "string" })
  t.deepEqual(schemas.folders, { name: "string" })
})
