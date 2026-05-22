import { useState, createContext, useEffect } from "react";
import axios from "axios"
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const backendUrl = import.meta.env.VITE_BACKEND_URL
axios.defaults.baseURL = backendUrl

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [token, settoken] = useState(localStorage.getItem("token"))
    const [authUser, setauthUser] = useState(null)
    const [onlineUsers, setonlineUsers] = useState([])
    const [socket, setsocket] = useState(null)


    //check if user is authenticated and if so, set the user data and connect the socket
    const checkAuth = async () => {
        try {
            const { data } = await axios.get("/api/auth/check") 
            if (data.success) {
                setauthUser(data.user)
                connectSocket(data.user)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    //Login function to handle user authenticationn and socket connection
    const login = async (state, credentials) => {
        try {
            const { data } = await axios.post(`/api/auth/${state}`, credentials);
            if (data.success) {
                setauthUser(data.userData);
                connectSocket(data.userData);
                axios.defaults.headers.common["token"] = data.token;
                settoken(data.token);
                localStorage.setItem("token", data.token);
                toast.success(data.message)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    //Logout function to handle user logout and socket disconnection 
    const logout = async () => {
        localStorage.removeItem("token")
        settoken(null);
        setauthUser(null);
        setonlineUsers([]);
        axios.defaults.headers.common["token"] = null;
        toast.success("Logged out successfully");
        socket.disconnect();
    }

    //Update profile function to handle user profile updates
    const updateProfile= async (body)=>{
        try {
           const {data}=await axios.put("/api/auth/update-profile",body);
           console.log(data);
           if(data.success){
                setauthUser(data.user);
                toast.success("Profile updated successfully");
                return true; // Indicate success
           } else {
                toast.error(data.message || "Profile update failed.");
                return false; // Indicate failure
           }
        } catch (error) {
            toast.error(error.message);
            return false; // Indicate failure
        }
    }

    //connect socket function to handle socket connection and online users updates
    const connectSocket = (userData) => {
        if (!userData || socket?.connected) return;
        const newSocket = io(backendUrl, {
            query: {
                userId: userData._id,
            }
        });
        newSocket.connect();
        setsocket(newSocket);

        newSocket.on("getOnlineUsers", (userIds) => {
            setonlineUsers(userIds)
        })
    }

    useEffect(() => {
        if (token) {
            axios.defaults.headers.common["token"] = token;
        }
        checkAuth()
    }, [])

    const value = {
        axios,
        authUser,
        onlineUsers,
        socket,
        login,
        logout,
        updateProfile
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}