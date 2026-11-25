import React from "react";
import { createRoot } from "react-dom/client";
import CloudPet from "./components/CloudPet";
import "./app/globals.css";
createRoot(document.getElementById("root")!).render(<React.StrictMode><CloudPet/></React.StrictMode>);
