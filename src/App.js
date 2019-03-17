import React from "react";
import { loop, Cmd } from "redux-loop";
import { useReduxLoop } from "./useReduxLoop";

const pause = time => new Promise(resolve => setTimeout(resolve, time));

function fetchUserAction() {
  return {
    type: "USER_FETCH",
    userId: "123"
  };
}

async function fetchUser(userId) {
  await pause(1000);
  return fetch(`/api/users/${userId}`).then(response => response.json());
}

function userFetchSuccessfulAction(user) {
  return {
    type: "USER_FETCH_SUCCESSFUL",
    user
  };
}

function userFetchFailedAction(error) {
  return {
    type: "USER_FETCH_ERROR",
    error
  };
}

const initialState = {
  loading: false,
  user: null,
  error: null
};

function reducer(state, action) {
  switch (action.type) {
    case "USER_FETCH":
      if (state.loading) return state;

      return loop(
        { ...initialState, loading: true },
        Cmd.run(fetchUser, {
          successActionCreator: userFetchSuccessfulAction,
          failActionCreator: userFetchFailedAction,
          args: [action.userId]
        })
      );

    case "USER_FETCH_SUCCESSFUL":
      return { ...initialState, user: action.user, loading: false };

    case "USER_FETCH_ERROR":
      return {
        ...initialState,
        error: action.error.toString(),
        loading: false
      };

    default:
      return state;
  }
}

const App = () => {
  const [state, dispatch] = useReduxLoop(reducer, initialState);

  return (
    <>
      <code>
        <pre>{JSON.stringify(state, null, 2)}</pre>
      </code>
      <button onClick={() => dispatch(fetchUserAction())}>dispatch</button>
    </>
  );
};

export default App;
