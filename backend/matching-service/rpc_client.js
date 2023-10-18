#!/usr/bin/env node
require('dotenv').config();
function main(userObj, complexity, timeOfReq) {
    return new Promise((resolve, reject) => {
        var amqp = require('amqplib/callback_api');

        var ans = 'expired request';
        amqp.connect(process.env.CLOUDAMQP_URL + "?heartbeat=60", function(error0, connection) {
            if (error0) {
                throw error0;
            }
            console.log('Client connected to Cloud AMQP');
            connection.createChannel(function(error1, channel) {
                if (error1) {
                    throw error1;
                }
                // create exclusive queue
                channel.assertQueue('', {
                    exclusive: true
                }, function(error2, rpc_q) {
                    if (error2) {
                        throw error2;
                    }
                    var correlationId = generateUuid();
                    
                    console.log(' [x] Requesting user: %s, complexity: %s, time of request: %s', userObj.username.toString(), complexity, timeOfReq.toString());
                    // check if there is an existing matching request in queue
                    channel.assertQueue(complexity, {
                        durable: true
                    }, function(error3, q) {
                        if (error3) {
                            throw error3;
                        }
                        const currTime = new Date().getTime();
                        // check if req was made within 30s
                        const timeDiff = currTime - timeOfReq;
                        console.log('timediff: ' + timeDiff.toString());
                        if (timeDiff > 29900) {
                            if (connection) {
                                connection.close(function() {
                                    console.log('closing');
                                    resolve(ans);
                                });
                            }
                            
                        } 
                        setTimeout(() => {
                            console.log(' [.] no match found');
                            console.log(' [3] messages in queue ' + q.messageCount);
                            channel.consume(q.queue, function(msg) {
                                const message = JSON.parse(msg.content);
                                console.log('removed ' + message.userObj.username + ' from ' + complexity + ' queue');
                                ans = 'no match found';
                                if (connection) {
                                    connection.close(function() {
                                        console.log('closing');
                                        resolve(ans);
                                    });
                                }
                                
                            });
                            
                        }, 29500 - timeDiff);

                        console.log(' [0] Message Count in ' + complexity + ' queue: ' + q.messageCount);
                        if (q.messageCount > 0) {
                            // found partner
                            channel.consume(q.queue, function(msg) {
                                const message = JSON.parse(msg.content);
                                console.log('found partner');
                                // send self data to partner
                                const self_data = JSON.stringify({ userObj, timeOfReq, correlationId, rpc_q });
                                channel.sendToQueue(message.rpc_q.queue, Buffer.from(self_data));
                                // return partner username
                                ans = message.userObj.username;
                                connection.close(function() {
                                    console.log('closing');
                                    resolve(ans);
                                });
                                
                                });
                        } else {
                            const self_data = JSON.stringify({ userObj, timeOfReq, correlationId, rpc_q });
                            console.log('sent self_data to ' + q.queue);
                            channel.sendToQueue(q.queue, 
                                Buffer.from(self_data));
                            console.log(' [1] Message Count in ' + complexity + ' queue: ' + q.messageCount);
                        }
                        
                        channel.consume(rpc_q.queue, function(msg) {
                            console.log('rpc_queue');
                            if (msg.properties.correlationId === correlationId) {
                                const message = JSON.parse(msg.content);
                                ans = message.userObj.username;
                                console.log(' [.] Got %s', msg.content.toString());
                                setTimeout(function() {
                                    console.log('closing');
                                    connection.close();
                                }, 500);
                                resolve(ans);
                            }
                        }, {
                            noAck: false
                        });
                    });
                });
            });
        });
    });
}


function generateUuid() {
    return Math.random().toString() +
        Math.random().toString() +
        Math.random().toString();
}

module.exports = { main }