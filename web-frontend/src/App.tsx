import { useKeycloak } from "@react-keycloak/web";
import Login from "./pages/Login";
import Home from "./pages/Home";

export default function App() {
  const { keycloak, initialized } = useKeycloak();

  if (!initialized) return <div color="green"> Tessssst Deeeev Eloka mich</div>;
  if (!keycloak.authenticated) return <Login />;
// sscgggsdfdfdf
  return <Home />;
}


