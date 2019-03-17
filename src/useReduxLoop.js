import { useReducer, useState, useRef, useEffect, useCallback } from "react";
import { liftState } from "redux-loop";
import { executeCmd } from "redux-loop/src/cmd";

const defaultLoopConfig = {
  DONT_LOG_ERRORS_ON_HANDLED_FAILURES: true
};

export function useReduxLoop(reducer, initialState, initializer) {
  const [[initialModel, initialCmd]] = useState(() => liftState(initialState));

  const cmdsQueue = useRef(
    initialCmd && initialCmd.type !== "NONE"
      ? [
          {
            originalAction: { type: "@@ReduxLoop/INIT" },
            cmd: initialCmd
          }
        ]
      : []
  );

  const liftedReducer = useCallback(
    ([counter, state], action) => {
      console.log(action.type);
      cmdsQueue.current = [];
      const [model, cmd] = liftState(reducer(state, action));
      if (cmd.type !== "NONE") {
        cmdsQueue.current.push({ originalAction: action, cmd });
        counter += 1;
      }
      return [counter, model];
    },
    [cmdsQueue, reducer]
  );

  const [[counter, state], dispatch] = useReducer(
    liftedReducer,
    [0, initialModel],
    initializer
  );

  useEffect(() => {
    if (cmdsQueue.current.length === 0) return;

    const runCmd = ({ originalAction, cmd }) => {
      const cmdPromise = executeCmd(cmd, dispatch, state, defaultLoopConfig);

      if (!cmdPromise) return null;

      return cmdPromise
        .then(actions => {
          if (actions.length === 0) return;
          // Warning: State updates from the useState() and useReducer() Hooks don't support the second callback argument.
          // To execute a side effect after rendering, declare it in the component body with useEffect().
          //
          // Potential source of errors, because dispatch can be called after unmount
          return Promise.all(actions.map(dispatch));
        })
        .catch(error => {
          console.error(originalAction.type, error);
          throw error;
        });
    };

    // execute current queue
    cmdsQueue.current.map(runCmd);
    // clean queue
    cmdsQueue.current = [];
  }, [
    // useEffect has a missing dependency: 'state'. Either include it or remove the dependency array  react-hooks/exhaustive-deps
    counter,
    cmdsQueue,
    dispatch
  ]);

  return [state, dispatch];
}
