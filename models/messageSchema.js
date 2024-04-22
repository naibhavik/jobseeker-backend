// models/Message.js
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
	message: {
		type: String,
		required: true
	},
	user: {
		type: String,
		required: true
	},
	time: {
		type: String,
		required: true
	},
	roomId: {
		type: String,
		required: true
	}
});

const Message = mongoose.model('Message', messageSchema);

export default Message;
