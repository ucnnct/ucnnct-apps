import { useKeycloak } from "@react-keycloak/web";
import Login from "./pages/Login";
import Home from "./pages/Home";

export default function App() {
  const { keycloak, initialized } = useKeycloak();

  <div color="green"> CEloka mich</div>;
  return <Home />;
}


