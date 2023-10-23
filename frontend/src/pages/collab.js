import '../App.css';
import '../styles/collab.css';
import React, { useState, useEffect, useRef } from 'react';
import axios from "axios";
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import io from 'socket.io-client';

import { Grid } from '@mui/material';
import Chip from '@mui/material/Chip';
import MonacoEditor from 'react-monaco-editor';

import { standardToast } from '../styles/toastStyles';
import { QUESTION_API_URL } from '../config';
import { logout } from '../helpers';
import { RenderedDescription, DifficultyText } from '../helpers/questionFormatters';

function Collab() {
  const [question, setQuestion] = useState(null);
  const [code, setCode] = useState('');
  const socketRef = useRef();
  const navigate = useNavigate();
  const { roomId } = useParams();

  const editorDidMount = (editor, monaco) => {
    console.log('editorDidMount', editor);
    editor.focus();
  }

  const handleChange = (value, event) => {
    setCode(value);
    socketRef.current.emit('code-change', roomId, value);
  }

  useEffect(() => {
    // generate a random question from db
    const ids = [1, 2, 13, 20]; // list of sample ids currently in db
    const randomIndex = Math.floor(Math.random() * ids.length);
    const randomId = ids[randomIndex];

    // get questions from database
    axios.post(
      QUESTION_API_URL + "/question/getQuestionById",
      { id: randomId },
      { withCredentials: true, credentials: 'include' }
    )
    .then(response => {       
      setQuestion(response.data)
    })
    .catch(error => {
      if (error.response.status === 401) {
        navigate('/');
        logout();
        console.log("Unauthorized access. Logged out.");
        toast.error("Unauthorized access.", standardToast);
        return;
      }
      if (error.response.status === 404) {
        console.log("Could not find the question.");
        toast.error("Could not find the question.", standardToast);
        return;
      }
      if (error.response.status === 500) {
        console.log("There was an error loading the question.");
        toast.error("There was an error loading the question.", standardToast);
        return;
      }
    console.error(error)});

    socketRef.current = io('http://localhost:80',  { transports : ['websocket'] });

    console.log(roomId)
    socketRef.current.emit('join-room', roomId);

    socketRef.current.on('code-change', (newCode) => {
      if (newCode !== code) {
        setCode(newCode);
      }
    });

    // Clean up the socket connection on unmount
    return () => {
      socketRef.current.disconnect();
    };
    // Do not remove the next line
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate])

  return (
    <div>
    {
      question &&
      <div className="collab-wrapper">
      <Grid container spacing={2}>
        {/* Left side of page */}
        <Grid item xs={5} style={{height: '85vh'}}>
          <div className="collab-section-header">
            Description
          </div>
          <div className="collab-question-content">
            <b className="question-title">{question.id}. {question.title}</b>
            <br />
            <DifficultyText difficulty={question.complexity} />
            <br />
            {question.categories.map((category) => (
              <Chip key={category} label={category} style={{ height: "25px" }}></Chip>
            ))}
            <RenderedDescription text={question.description} />
          </div>

        </Grid>

        {/* Right side of page */}
        <Grid item xs={7} style={{maxHeight: '85vh', overflow: 'auto'}}>
          <div className="collab-section-header">
            Javascript
          </div>
          <div className="collab-editor-content">
          <MonacoEditor
            width="100%"
            height="400"
            language="javascript"
            value={code}
            editorDidMount={editorDidMount}
            onChange={handleChange}
          />
          </div>

          {/* Chat and video call */}
          <Grid container spacing={2} style={{height: "31%"}}>
            <Grid item xs={6} style={{marginTop: "10px", maxHeight: "94%"}}>
              <div className="collab-section-header">
                Chat
              </div>
              <div className="collab-chat-content">
                u r matched with (some user)
              </div>
            </Grid>
            <Grid item xs={6} style={{marginTop: "10px", maxHeight: "94%"}}>
              <div className="collab-section-header">
                Video Call
              </div>
              <div className="collab-chat-content">
                :)
              </div>
            </Grid>
          </Grid>

        </Grid>
      </Grid>
    </div>
    }
    </div>
  );
}

export default Collab;