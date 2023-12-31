import { createContext, useState } from "react";

export const UserContext = createContext();

const UserContextProvider = ({ children }) => {
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user")) || null
  );

  const logoutUserContext = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("jwtToken");
    setUser(null);
  };

  const loginUserContext = (user, token) => {
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("jwtToken", token);
    setUser(user);
  };

  const updateUserContext = (user) => {
    localStorage.setItem("user", JSON.stringify(user));
    setUser(user);
  };

  return (
    <UserContext.Provider
      value={{ user, loginUserContext, logoutUserContext, updateUserContext }}
    >
      {children}
    </UserContext.Provider>
  );
};

export default UserContextProvider;
