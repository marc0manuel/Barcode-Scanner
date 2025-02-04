import React, { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

function capitalizeFirstLetter(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export default function App() {
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [lastScannedItem, setLastScannedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const scannerRef = useRef(null);

  useEffect(() => {
    if (scanning) {
      startScanner();
    } else {
      stopScanner();
    }
    return () => stopScanner();
  }, [scanning]);

  const startScanner = () => {
    try {
      const html5QrCode = new Html5Qrcode("scanner");
      scannerRef.current = html5QrCode;

      html5QrCode.start(
        { facingMode: "environment" },
        { fps: 15, qrbox: { width: 350, height: 350 } },
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        (error) => {
          handleScanError(error);
        }
      );
    } catch (error) {
      console.error("Initialization Error:", error);
      setCameraError(`Initialization Error: ${error.message || error}`);
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch((error) => {
        console.error("Scanner cleanup error:", error);
      });
      scannerRef.current = null;
    }
  };

  const handleScanSuccess = async (decodedText) => {
    console.log("Scanned:", decodedText);

    if (!decodedText || isNaN(decodedText)) {
      return;
    }

    try {
      const url = `https://world.openfoodfacts.org/api/v3/product/${decodedText}.json`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error("Open Food Facts API Error. Status:", response.status);
        return;
      }

      const jsonData = await response.json();
      console.log("Open Food Facts Data:", jsonData);

      if (jsonData?.product) {
        const { product } = jsonData;

        const productName = product.product_name || "(No name found)";
        const imageUrl = product.image_front_url || "";
        const firstTag = product.origins || product.manufacturing_places || capitalizeFirstLetter(product.countries_tags[0].replace(/^en:/, ""));
        let country = firstTag;
        
         // countries_tags is an array like ["en:canada", "en:france"]
         // We'll just extract the first entry for demonstration:
        // let country = "(Unknown)";
         //if (Array.isArray(product.countries_tags) && product.countries_tags.length > 0) {
           // For example: "en:canada"
          // const firstTag = capitalizeFirstLetter(product.countries_tags[0].replace(/^en:/, "")); 
           // We can remove the "en:" prefix for a cleaner display
         //  country = capitalizeFirstLetter(firstTag.replace(/^en:/, ""));
        // }
        setLastScannedItem({
          barcode: decodedText,
          productName: productName,
          imageUrl: imageUrl,
          country: country,
        });

        // Open the modal with product details
        setIsModalOpen(true);
      } else {
        console.warn("No product data available from Open Food Facts.");
      }
    } catch (err) {
      console.error("Fetch Error:", err);
    }
  };

  const handleScanError = (error) => {
    if (error?.name === "NotFoundException") {
      return;
    }
    console.error("Camera Error:", error);
  };

  return (
    <div style={{ padding: "20px", textAlign: "center" }}>
      <h1>Open Food Facts Scanner</h1>

      {!scanning && (
        <button
          onClick={() => setScanning(true)}
          style={{
            padding: "15px 30px",
            fontSize: "1.1rem",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Start Scanner
        </button>
      )}

      {scanning && (
        <>
          <div
            id="scanner"
            style={{
              width: "100%",
              maxWidth: "600px",
              margin: "20px auto",
            }}
          />
          <button
            onClick={() => setScanning(false)}
            style={{
              padding: "15px 30px",
              fontSize: "1.1rem",
              backgroundColor: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Stop Scanner
          </button>
        </>
      )}

      {cameraError && (
        <div style={{ color: "red", marginTop: "20px" }}>
          <p>{cameraError}</p>
          <p>Please refresh and allow camera access.</p>
        </div>
      )}

      {/* MODAL for scanned product */}
      {isModalOpen && lastScannedItem && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "80%",
            maxWidth: "400px",
            backgroundColor: "white",
            padding: "20px",
            boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.3)",
            borderRadius: "10px",
            zIndex: 1000,
            textAlign: "center",
          }}
        >
          <h2>Product Scanned</h2>

          {lastScannedItem.imageUrl && (
            <img
              src={lastScannedItem.imageUrl}
              alt={lastScannedItem.productName}
              style={{ maxWidth: "100px", margin: "10px 0" }}
            />
          )}

          <p>
            <strong>Name:</strong> {lastScannedItem.productName}
          </p>

          <p>
            <strong>Country:</strong> {lastScannedItem.country}
          </p>

          <button
            onClick={() => setIsModalOpen(false)}
            style={{
              marginTop: "15px",
              padding: "10px 20px",
              fontSize: "1rem",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
