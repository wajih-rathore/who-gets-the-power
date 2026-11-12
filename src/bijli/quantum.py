"""QAOA on the Who Gets the Power? QUBO (Qiskit simulator)."""
import time

import numpy as np
from qiskit.primitives import StatevectorSampler
from qiskit.quantum_info import Statevector
from qiskit_optimization.minimum_eigensolvers import QAOA
from qiskit_optimization.optimizers import COBYLA

from .model import W, to_qubo


def run_qaoa(qp, reps=2, seed=7, maxiter=300, penalty=W["penalty"]):
    """Run QAOA; return final-state probabilities over all 2^n plans plus run info."""
    op, offset = to_qubo(qp, penalty).to_ising()
    scale = np.max(np.abs(op.coeffs))  # normalise so the optimiser sees angles of order 1
    rng = np.random.default_rng(seed)
    evals = []  # every objective evaluation: callback(eval_count, params, mean, metadata)

    def record(i, params, mean, meta):
        evals.append({"i": i, "energy": float(np.real(mean)) * scale + offset, "params": [float(p) for p in params]})

    qaoa = QAOA(sampler=StatevectorSampler(seed=seed), optimizer=COBYLA(maxiter=maxiter), reps=reps, callback=record,
                initial_point=rng.uniform(-0.5, 0.5, 2 * reps))
    t = time.time()
    res = qaoa.compute_minimum_eigenvalue(op / scale)
    seconds = time.time() - t
    circ = res.optimal_circuit.assign_parameters(res.optimal_point).remove_final_measurements(inplace=False)
    probs = Statevector(circ).probabilities()  # index i <-> bitstring, variable q = (i >> q) & 1
    return {"probs": probs, "seconds": seconds, "qubits": circ.num_qubits, "evals": evals, "ansatz": res.optimal_circuit,
            "point": res.optimal_point}
