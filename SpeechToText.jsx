import { useState, useEffect, useRef } from "react";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { UilMicrophone } from "@iconscout/react-unicons";
import { UilMicrophoneSlash } from "@iconscout/react-unicons";
import Select from "react-select";
import styles from "./speechtotext.module.css";
import { speechLanguages } from "./speechLanguages";

import { sendMessageToServer } from "../../lib/sendMessage";

const SPEECH_KEY = "490975f3e43c4e9e90b61d068fa2cd0b";
const SPEECH_REGION = "centralindia";

export default function SpeechToTextComponent({ setMessages, debug = false }) {
  const [isListening, setIsListening] = useState(true);
  const [speechLanguage, setSpeechLanguage] = useState("en-US"); // Default language

  const speechConfig = useRef(null);
  const audioConfig = useRef(null);
  const recognizer = useRef(null);

  const [myTranscript, setMyTranscript] = useState("");
  // const [recognizingTranscript, setRecTranscript] = useState("");

  useEffect(() => {
    speechConfig.current = sdk.SpeechConfig.fromSubscription(
      SPEECH_KEY,
      SPEECH_REGION
    );

    // Set the selected language from the state
    speechConfig.current.speechRecognitionLanguage = speechLanguage;

    audioConfig.current = sdk.AudioConfig.fromDefaultMicrophoneInput();
    recognizer.current = new sdk.SpeechRecognizer(
      speechConfig.current,
      audioConfig.current
    );

    const processRecognizedTranscript = (event) => {
      const result = event.result;
      console.log("Recognition result:", result);

      if (result.reason === sdk.ResultReason.RecognizedSpeech) {
        const transcript = result.text;
        console.log("Transcript: -->", transcript);
        // Call a function to process the transcript as needed

        setMyTranscript(transcript);
      }
    };

    // const processRecognizingTranscript = (event) => {
    //   const result = event.result;
    //   console.log("Recognition result:", result);
    //   if (result.reason === sdk.ResultReason.RecognizingSpeech) {
    //     const transcript = result.text;
    //     console.log("Transcript: -->", transcript);
    //     // Call a function to process the transcript as needed

    //     setRecTranscript(transcript);
    //   }
    // };

    recognizer.current.recognized = (s, e) => processRecognizedTranscript(e);
    recognizer.current.recognizing = (s, e) => processRecognizingTranscript(e);

    recognizer.current.startContinuousRecognitionAsync(() => {
      console.log("Speech recognition started.");
      setIsListening(true);
    });

    return () => {
      recognizer.current.stopContinuousRecognitionAsync(() => {
        setIsListening(false);
      });
    };
  }, [speechLanguage]); // Listen for changes in speechLanguage

  const resumeListening = () => {
    if (!isListening) {
      setIsListening(true);
      recognizer.current.startContinuousRecognitionAsync(() => {
        console.log("Resumed listening...");
      });
    }
  };

  const stopListening = () => {
    setIsListening(false);
    recognizer.current.stopContinuousRecognitionAsync(() => {
      console.log("Speech recognition stopped.");
      console.log("Sending message to server:", myTranscript);
      if (myTranscript) {
        setMessages((prevMessages) => [
          ...prevMessages,
          { text: myTranscript, type: "user" },
        ]);
        let response = sendMessageToServer(myTranscript);
        setMessages((prevMessages) => [
          ...prevMessages,
          { text: response, type: "server" },
        ]);
      }
    });
  };

  const handleButtonClick = () => {
    if (isListening) {
      stopListening();
    } else {
      resumeListening();
    }
  };

  // Handle language selection change
  const handleLanguageChange = (newValue) => {
    const selectedLanguage = newValue.value;
    console.log("Selected language:", selectedLanguage);
    setSpeechLanguage(selectedLanguage);
  };

  return (
    <div className={styles.container}>
      {/* Dropdown to select the language */}

      <div className={styles.audio_container}>
        <Select
          className={styles.select}
          options={speechLanguages}
          placeholder="Select Language"
          defaultValue={{ value: "en-US", label: "English (US)" }}
          menuPlacement="top"
          onChange={handleLanguageChange}
        />

        <div className={styles.button_container}>
          <button
            className={
              isListening
                ? `${styles.listening} ${styles.action_button}`
                : `${styles.muted} ${styles.action_button}`
            }
            onClick={handleButtonClick}
          >
            {isListening ? <UilMicrophone /> : <UilMicrophoneSlash />}
          </button>
        </div>
      </div>

      {debug && (
        <div className={styles.transcript_container}>
          <div className={styles.transcript}>
            Recognizing Transcript : {recognizingTranscript}
          </div>
          <div className={styles.transcript}>
            Recognized Transcript : {myTranscript}
          </div>
        </div>
      )}
    </div>
  );
}
