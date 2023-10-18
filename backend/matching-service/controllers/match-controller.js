async function sendMatchingRequest(req, res) {
    try {
      const rpc_client = require('../rpc_client.js');
      const { userObj, complexity, timeOfReq } = req.body;
      const matchedUserObj = await rpc_client.main(userObj, complexity, timeOfReq);
      console.log('received matched user?');
      return res.status(200).send(matchedUserObj);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'An error occurred' });
    }
  }

  module.exports = { sendMatchingRequest };