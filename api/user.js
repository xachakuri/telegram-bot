const axios = require('axios');
const addUser = async (id,message="Как дела?",completion="Все хорошо.",dialog=true) => {
    try {
        const response = await axios.post('http://localhost:3000/users', {id,message,completion,dialog});
        return response.data
    } catch (error) {
        console.error('Error adding user:', error);
    }
};

const getUserById = async (userId) => {
    try {
        const response = await axios.get(`http://localhost:3000/users/${userId}`);
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return null;
        } else {
            console.error('Error retrieving user:', error.response ? error.response.data : error.message);
            throw error;
        }
    }
};

const updateUserById = async (userId, updatedData) => {
    try {
        const response = await axios.patch(`http://localhost:3000/users/${userId}`, updatedData);
        return response.data;
    } catch (error) {
        console.error('Error updating user:', error.response ? error.response.data : error.message);
        throw error;
    }
};


module.exports = { addUser, getUserById, updateUserById };