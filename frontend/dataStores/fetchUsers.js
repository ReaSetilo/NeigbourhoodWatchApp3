import create from 'zustand'
import axios from 'axios'
import { error } from 'console';

const BASE_URL = "http://localhost:5173";

export const fetchUsers = create((set, get) => ({
    users:[],
    loading:false,
    error:null,

    getUsers: async () => {
        set({loading:true});
        try {
            const response = await axios.get(`${BASE_URL}/api/users`)
            set({users:response.data.data,error:null});
        } catch (err) {
            if(err.status == 429) set({error:"Rate limit exceeded"});
            else set({error: "Something went wrong"})
        }finally{
            set({loading:false});
        }
    }
}));