var test = require('tape')

var JSONAPI = require('..')

const audienceResponse = require('./fixtures/audience-response.json')
const audienceSchemas = {
  audiences: require('./fixtures/schemas/audience.json'),
  "targeting-attributes": require('./fixtures/schemas/targeting-attribute.json'),
  "targeting-attribute-groups": require('./fixtures/schemas/targeting-attribute-group.json'),
  "targeting-categories": require('./fixtures/schemas/targeting-category.json')
}

test('parses an audience with deep relationships as expected', t => {
  t.plan(3)
  var f = JSONAPI(audienceSchemas, '/api')('audiences')
  var api = f(audienceResponse.data, { included: audienceResponse.included })
  t.ok(api.data.relationships.attribute_groups, 'includes relationships on the specified key')
  var att = api.included.filter(a => {
    return a.type === 'targeting-attributes'
  })[0]
  t.equal(att.attributes.name, 'Credit cards', 'includes attributes on the included keys')
  var group = api.included.filter(a => {
    return a.type === 'targeting-attribute-groups'
  })[0]
  t.equal(group.relationships.attributes.data[0].type, 'targeting-attributes', 'includes relationships on the included keys')
})
