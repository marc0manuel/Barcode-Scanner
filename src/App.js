import React, { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

function capitalizeFirstLetter(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export default function App() {
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [lastScannedItem, setLastScannedItem] = useState(null);
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
        { facingMode: "environment" }, // or { facingMode: "user" }
        {
          fps: 15,
          qrbox: { width: 350, height: 350 },
        },
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

    // Basic check: if not numeric, ignore
    if (!decodedText || isNaN(decodedText)) {
      return;
    }

    try {
      // Open Food Facts API v3 endpoint for product lookup
      // Example: https://world.openfoodfacts.org/api/v3/product/817351000128.json
      const url = `https://world.openfoodfacts.org/api/v3/product/${decodedText}.json`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error("Open Food Facts API Error. Status:", response.status);
        return;
      }

      const jsonData = await response.json();
      console.log("Open Food Facts Data:", jsonData);

      // Check if the API found a product
      if (jsonData?.product) {
        const { product } = jsonData;

        // Extract the fields you care about:
        const productName = product.product_name || "(No name found)";
        const imageUrl = product.image_front_url || "";
        const firstTag = product.manufacturing_places || product.countries;
       let country = firstTag;
        // countries_tags is an array like ["en:canada", "en:france"]
        // We'll just extract the first entry for demonstration:
       // let country = "(Unknown)";
        //if (Array.isArray(product.countries_tags) && product.countries_tags.length > 0) {
          // For example: "en:canada"
         // const firstTag = product.countries_tags[0]; 
          // We can remove the "en:" prefix for a cleaner display
        //  country = capitalizeFirstLetter(firstTag.replace(/^en:/, ""));
       // }

        // Update the state
        setLastScannedItem({
          barcode: decodedText,
          productName: productName,
          imageUrl: imageUrl,
          country: country,
        });
      }
      else {
        // The product might not be found or some error occurred
        console.warn("No product data available from Open Food Facts.");
      }
    } catch (err) {
      console.error("Fetch Error:", err);
    }
  };

  const handleScanError = (error) => {
    if (error?.name === "NotFoundException") {
      // Ignore "no barcode found in frame" errors
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

      {lastScannedItem && (
        <div style={{ marginTop: "20px", fontSize: "1.2rem" }}>
          <p><strong>UPC Scanned:</strong> {lastScannedItem.barcode}</p>

          <p><strong>Product Name:</strong> {lastScannedItem.productName}</p>
          
          {lastScannedItem.imageUrl && (
            <img
              src={lastScannedItem.imageUrl}
              alt={lastScannedItem.productName}
              style={{ maxWidth: "200px", margin: "10px 0" }}
            />
          )}

          <p><strong>Country:</strong> {lastScannedItem.country}</p>
        </div>
      )}
    </div>
  );
}
