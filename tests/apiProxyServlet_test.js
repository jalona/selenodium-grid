var server = require('../server'),
    expect = require('must'),
    q = require('q'),
    supertest = require('./q-supertest'),
    helpers = require('./helpers'),
    registry = require('../lib/registry');

describe('apiProxyServlet', function() {
    var app;
    before(function() {
        return server()
            .then(function(application) {
                app = application;
            });
    });

    after(function(done) {
        app.destroy(done);
    });

    describe('GET /grid/api/proxy', function() {
        describe('simple', function() {
            it('must respond with error if the node was not registered first', function() {
                // query for the node id
                return supertest(app)
                    .get('/grid/api/proxy?id=http://127.0.0.1:5560')
                    .expect(404, {
                        msg: 'Cannot find proxy with ID=http://127.0.0.1:5560 in the registry.',
                        success: false
                    });
            });

            it('must respond with ok if the node was registered before', function() {
                // register node on the grid
                return supertest(app)
                    .post('/grid/register')
                    .send(helpers.createRegisterPost({port: 5560}))
                    .expect(200, 'OK - Welcome')
                    .then(function() {
                        // query for the node id
                        return supertest(app)
                            .get('/grid/api/proxy?id=http://127.0.0.1:5560')
                            .expect(200, {
                                msg: 'Proxy found!',
                                success: true
                            });
                    });
            });
        });

        describe('timeout', function() {
            var nodeTimeoutOld;
            before(function() {
                nodeTimeoutOld = registry.NODE_TIMEOUT;
                registry.NODE_TIMEOUT = 1000;
            });

            after(function() {
                registry.NODE_TIMEOUT = nodeTimeoutOld;
            });

            beforeEach(function() {
                // register node on the grid
                return supertest(app)
                    .post('/grid/register')
                    .send(helpers.createRegisterPost({port: 5560}))
                    .expect(200, 'OK - Welcome');
            });

            it('must return a not found response if the node has not shown up again in NODE_TIMEOUT time', function() {
                this.timeout(5000);

                return q.delay(3000)
                    .then(function() {
                        return supertest(app)
                            // query for the node id
                            .get('/grid/api/proxy?id=http://127.0.0.1:5560')
                            .expect(404, {
                                msg: 'Cannot find proxy with ID=http://127.0.0.1:5560 in the registry.',
                                success: false
                            });
                    });
            });

            // TODO: move this test out to registerservlet_test or registry_test
            it('must be possible to register the node again after it has been removed from registry after NODE_TIMEOUT time', function() {
                this.timeout(5000);

                return q.delay(3000)
                    .then(function() {
                        // query for the node id
                        return supertest(app)
                            .get('/grid/api/proxy?id=http://127.0.0.1:5560')
                            .expect(404, {
                                msg: 'Cannot find proxy with ID=http://127.0.0.1:5560 in the registry.',
                                success: false
                            })
                    })
                    .then(function() {
                        // register node on the grid
                        return supertest(app)
                            .post('/grid/register')
                            .send(helpers.createRegisterPost({port: 5560}))
                            .expect(200, 'OK - Welcome');
                    });
            });
        });
    });
});