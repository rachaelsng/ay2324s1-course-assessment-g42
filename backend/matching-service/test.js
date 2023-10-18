const rpc_client = require('./rpc_client.js');
const userObj = {
    username: 'test1e',
    email: 'testie@gmail.com',
    password: 'testie1234',
    role: 'user'
  };
const complexity = 'Medium';
const timeOfReq = new Date().getTime();
async function func() {
    const matchedUserObj = await rpc_client.main(userObj, complexity, timeOfReq);
    console.log(matchedUserObj);
}
func();
