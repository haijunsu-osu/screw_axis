# Screw Axis Visualizer

This project provides an offline Three.js application that visualises the screw motion relating two rigid body poses. You can open the visualiser directly in your browser through [the live preview](https://htmlpreview.github.io/?https://github.com/haijunsu-osu/screw_axis/blob/main/index.html). A screw motion is the combination of a rotation about a line together with a translation along that same line. This representation comes from the Mozzi–Chasles theorem, which states that any proper Euclidean displacement of a rigid body can be expressed as a rotation by an angle $\phi$ about a screw axis ${\bf s}$, followed by a slide $d$ along that axis.

The application lets you edit the homogeneous transformation (3×4 matrix), or equivalently the intrinsic Euler angles and translation vector, and immediately computes:

- the unit direction ${\bf s}$ of the screw axis,
- a point ${\bf C}$ on that axis,
- the rotation angle $\phi$, and
- the translation distance $d$ along the axis.

It also renders the final and animated body frames, overlays the screw axis as a dashed line, highlights the axis point and its projection from the body origin, and traces the path of the moving frame during the screw motion.

## Theoretical background

Given a rigid-body transform

$$
D({\bf x}) = A{\bf x} + {\bf t},
$$

the Mozzi–Chasles theorem (also known as Chasles’ theorem for kinematics) provides a constructive procedure for the screw parameters:

1. **Rotation axis direction** — The rotation matrix $A$ has a unique unit eigenvector associated with eigenvalue 1. Using quaternion extraction (or a matrix logarithm), we obtain the rotation axis ${\bf s}$ and angle $\phi$.
2. **Parallel/orthogonal translation split** — Decompose the translation vector ${\bf t}$ into components parallel and orthogonal to ${\bf s}$:

$$
{\bf t} = ({\bf t} \cdot {\bf s}) {\bf s} + {\bf t}_\perp.
$$

   The parallel component yields the axial slide $d = {\bf t} \cdot {\bf s}$.


3. **Axis point** — A point ${\bf C}$ on the axis is obtained by solving

$$
(I - A)\,{\bf C} = {\bf t}_\perp,
$$

   together with the constraint ${\bf s} \cdot {\bf C} = 0$. This ensures ${\bf C}$ lies in the plane perpendicular to ${\bf s}$ through the origin. When ${\bf t}_\perp = {\bf 0}$, the axis passes through the origin, so ${\bf C} = {\bf 0}$.


4. **Pitch** — The pitch of the screw is $p = d / \phi$ (with units of length per radian) when $\phi \ne 0$.

This construction handles special cases: a vanishing rotation reduces to a pure translation along ${\bf t}$; a vanishing translation yields a pure rotation about ${\bf s}$.

## Visualisation features

- Editable 3×4 transform and Euler angles with bidirectional synchronisation.
- Read-only screw-parameter fields populated from the current transform.
- Static target body (opaque) and animated body (semi-transparent) showing the approach motion.
- Dashed orange screw axis, red axis point, and red line from world origin to the axis.
- Black foot point and perpendicular segment from the moving body origin to the axis.
- Black trajectory polyline marking the motion path of the body origin.
- OrbitControls camera and half-transparent XY ground grid.


## References

- [Screw axis – Wikipedia](https://en.wikipedia.org/wiki/Screw_axis)
- J. M. McCarthy and G. S. Soh, *Geometric Design of Linkages*, 2nd ed., Springer, 2010.
- O. Bottema and B. Roth, *Theoretical Kinematics*, Dover Publications, 1990.
