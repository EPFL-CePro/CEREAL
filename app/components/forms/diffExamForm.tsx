"use client";
// This form allows users to register their exams into the system.
import { useForm, SubmitHandler } from "react-hook-form"
import ReactSelect from "./ReactSelect";
import { User } from "next-auth";
import { Inputs } from "@/types/inputs";
import React from "react";
import { BoFileForUser } from "@/types/boFile";

interface RegisterProps {
    user: AppUser
}

interface AppUser extends User {
    isAdmin?: boolean;
    sciper: string;
}

export default function App({ user }: RegisterProps) {

    const [boFileForUser, setBoFileForUser] = React.useState<BoFileForUser[] | null>(null);
    

    const { handleSubmit, control } = useForm<Inputs>({})

    const onSubmit: SubmitHandler<Inputs> = async (data) => {
        console.log(data)
    }

    async function getBoFile() {
        const res = await fetch("/api/cereal/diff-exams/check-existing-bo", {
            method: "GET",
        });
        if (!res.ok) {
            console.error(await res.text());
            return;
        }
        const responseJson = await res.json();

        if(!responseJson.boFile) {
            setBoFileForUser(null)
            return;
        }

        setBoFileForUser(responseJson.boFile.content.filter((element:{SCIPER:string}) => parseInt(element["SCIPER"]) == parseInt(user.sciper)));
    }

    React.useEffect(() => {
        getBoFile();
    }, [])

    return (
        /* "handleSubmit" will validate your inputs before invoking "onSubmit" */
        <div className="flex flex-col items-center m-24">
            <h1 className="text-3xl font-semibold mb-8 text-center" >CePro — Absence submission & Diff exam subscription</h1>
            <form className="max-w-[1000px] [&>label]:text-lg [&>*]:accent-red-500 p-4 rounded-md flex flex-col gap-3 mt-2 [&>select]:mb-2 [&>input,&>*>*>input]:mb-2 [&>input,&>textarea,&>*>*>input]:border [&>input,&>textarea,&>*>*>input]:border-slate-300 [&>input,&>textarea,&>*>*>input]:rounded-md [&>input,&>*>*>input]:p-2 [&>textarea]:p-2 "
                onSubmit={handleSubmit(onSubmit)}
                encType="multipart/form-data">
                {/* register your input into the hook by invoking the "register" function */}
                <label>Your email address</label>
                <ReactSelect control={control} label={"registeredBy"} name={"contact"} isMultiChoice={false} instanceId={2} user={user} disabled={true}/>

                {
                    boFileForUser ?
                        <>You are registered for {boFileForUser.length} exam(s).</>
                    :
                        <>No BO file uploaded for the moment. Please come back later.</>
                }

                <input className="btn btn-primary hover:cursor-pointer" type="submit" value="Submit exam registration" />
            </form>
        </div >

    )
}